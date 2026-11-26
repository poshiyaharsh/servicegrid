# FieldSutra — Offline-First Sync & Conflict Resolution Design

## 1. Local SQLite Schema & Retention
- All cached entities (`local_customers`, `local_assets`, `local_jobs`, `local_checklists`, `local_job_history`, `sync_outbox`, `local_attachment_queue`) are scoped by `tenant_id` and indexed for fast offline reads.
- Only jobs assigned to the authenticated technician (plus their associated customer contact/address/asset/checklist) are downloaded via `GET /api/v1/sync/assigned-jobs`.
- **Retention & Logout Policy:** On explicit logout (`MobileAuthService.logout`), `OfflineSyncEngine.wipeAllOnLogout()` purges all local tables and `SecureTokenStorage` removes access/refresh tokens. Synced outbox history older than 30 days is pruned via `pruneSyncedHistory(30)`.

## 2. Reliable Outbox Queue
- Every offline mutation (`STATUS_CHANGE`, `UPDATE_NOTES`, `CHECKLIST_UPDATE`, `PARTS_CONSUMED`, `ATTACHMENT_UPLOAD`, `SIGNATURE_CAPTURE`, `LOCATION_EVENT`) is persisted locally with `operationId`, `tenantId`, `userId`, `deviceId`, `sequenceNumber`, `clientVersion`, `attempts`, and `status` (`PENDING` → `UPLOADING` → `SYNCED` | `CONFLICT` | `FAILED`).
- On app startup, `recoverAfterRestart()` resets any `IN_FLIGHT` or `UPLOADING` operations back to `PENDING`.
- Network failures trigger exponential backoff (`computeBackoffMs`, 1.5s base up to 60s max) without discarding pending operations.

## 3. Server-Authoritative Conflict Resolution
- `POST /api/v1/sync/operations` checks:
  1. **Idempotency:** `sync_operations` table deduplicates repeated `operationId` submissions (`DUPLICATE_IGNORED`).
  2. **Authorization & Isolation:** Rejects cross-tenant (`NOT_FOUND`) and unassigned technician updates (`FORBIDDEN`).
  3. **Optimistic Concurrency:** If `clientVersion < serverVersion`, the server records and returns `CONFLICT` with `serverVersion` and `serverStatus`.
  4. **Status Transitions:** `assertValidTransition` validates job status transitions on the server; invalid transitions (e.g., job cancelled by admin while technician was offline) return `CONFLICT` rather than corrupting state.
- **UI Resolution (`SyncStatusScreen`):** Technicians can choose **Accept Server** (`ACCEPT_SERVER`) or **Reapply Mine** (`RETRY_WITH_SERVER_VERSION`).

## 4. Attachment & Signature Deduplication
- `local_attachment_queue` enforces a unique `(tenant_id, work_order_id, checksum)` index and `POST /api/v1/sync/attachments` deduplicates by `att:<checksum|attachmentId>` in `sync_operations`.
