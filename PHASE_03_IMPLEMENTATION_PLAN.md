# FieldSutra — Phase 03 Implementation Plan (Technician Mobile App & Offline-First Engine)

**Date:** 2026-11-26  
**Scope:** Phase 03 only (Mobile Architecture Audit, Technician Auth, Dashboard, Work Order Experience, Offline-First SQLite Engine, Outbox Queue, Conflict Resolution, Attachments/Signatures, Checklists, Location, Sync UX, Security & Comprehensive Testing).

---

## 1. Mobile Architecture Audit Findings

- **Stack (`apps/mobile/package.json`):** React `18.3.1`, React Native `0.76.5`, TypeScript `5.7.2`, `@servicegrid/types`, `@servicegrid/offline-sync`.
- **Current Gaps Identified:**
  1. **Navigation & State:** `App.tsx` has static props (`initializing`, `authenticated`) with no session state, screen router, or API integration. All 15 screens are stateless UI components.
  2. **Auth & Secure Storage:** No `@servicegrid/api-client` integration, no `SecureTokenStorage` abstraction (Android Keystore / EncryptedSharedPreferences), no session restoration or logout cleanup.
  3. **Backend Sync API (`apps/api/src/modules/sync/`):**
     - `GET /api/v1/sync/assigned-jobs` currently returns all tenant work orders without technician assignment filtering or hydrated customer/address/asset/checklist/history bundles.
     - `POST /api/v1/sync/operations` only processes `STATUS_CHANGE` and throws on invalid transitions instead of returning per-operation `CONFLICT` / `INVALID_TRANSITION` outcomes.
  4. **SQLite & Outbox (`apps/mobile/src/offline/`):**
     - `SQLITE_MIGRATIONS` lacks indexes, checklists, assets, history, sequence numbers, `user_id`, `device_id`, and `checksum` deduplication columns.
     - `OfflineSyncEngine` lacks sequence ordering, full operation types (notes/diagnosis/repair/parts/checklists/signatures/location), conflict resolution helpers, and secure logout cleanup.
  5. **Native Android Project:** No `android/` Gradle wrapper or `app.json` exists in `apps/mobile`; physical-device/emulator native builds are documented as a known environment limitation while all TypeScript, ESLint, and Node/TSX integration suites run natively.

---

## 2. Implementation Plan

1. **Backend Sync API Enhancements (`apps/api/src/modules/sync/`):**
   - Hydrate `GET /api/v1/sync/assigned-jobs` with technician-scoped work orders, permitted customer contact/address, asset details, checklists, and recent service history.
   - Extend `POST /api/v1/sync/operations` to idempotently handle `STATUS_CHANGE`, `UPDATE_NOTES` (diagnosis, repair, completion notes), `CHECKLIST_UPDATE`, `PARTS_CONSUMED`, `ATTACHMENT_UPLOAD`, `SIGNATURE_CAPTURE`, and `LOCATION_EVENT` with server-authoritative status transition validation and per-operation conflict reporting.
   - Add `POST /api/v1/sync/attachments` with tenant/work-order ownership verification and checksum deduplication.
2. **Mobile Auth, Secure Storage & API Client (`apps/mobile/src/auth/`, `apps/mobile/src/api/`):**
   - Implement `SecureTokenStorage` interface (with `MemorySecureStorage` for tests and native Keystore bridge interface for Android), `MobileAuthService` (login, session restoration via refresh token, logout + local data wipe, role/org/branch context, session expiration).
3. **Offline-First SQLite Engine, Outbox & Conflict Resolution (`packages/offline-sync/`, `apps/mobile/src/offline/`):**
   - Expand `SQLITE_MIGRATIONS` with `local_assets`, `local_checklists`, `local_job_history`, `local_sync_history`, indexes, `user_id`, `device_id`, `sequence_number`, and `checksum`.
   - Implement `SqliteAdapter` abstraction + `InMemorySqliteStore` for deterministic automated testing.
   - Upgrade `OfflineSyncEngine` with sequential outbox ordering, exponential backoff, network reconnection listener, duplicate protection, conflict resolution (`ACCEPT_SERVER` / `RETRY_WITH_SERVER_VERSION`), attachment deduplication & progress tracking, and logout cleanup.
4. **Technician Screens & Workflows (`apps/mobile/src/screens/` & `apps/mobile/src/App.tsx`):**
   - Wire state-driven navigation across Dashboard (search, filters, pull-to-refresh, counts, sync badge), My Jobs, Job Details (accept/start/pause/resume/complete, diagnosis/repair/parts/notes), Checklists (checkbox, text, numeric, required validation, photo evidence), Camera/Attachments (compression metadata, before/after, retry), Signature Capture, Navigation/Location (explicit permission + external Maps handoff), and Sync Status / Conflict Resolution UI.
5. **Testing & Documentation:**
   - Expand `apps/mobile/test/` and `apps/api/test/sync.spec.ts` to cover all 14 Acceptance Scenarios (A–N).
   - Produce `MOBILE_ARCHITECTURE.md`, `OFFLINE_SYNC_DESIGN.md`, `MOBILE_SECURITY_REVIEW.md`, `PHASE_03_COMPLETION_REPORT.md`, and update `DEVELOPMENT_STATUS.md`.
