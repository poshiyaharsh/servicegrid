# FieldSutra — Mobile Architecture (`apps/mobile`)

## 1. Overview
`apps/mobile` is an Android-first, offline-capable React Native (`0.76.5`) TypeScript technician application sharing `@servicegrid/types`, `@servicegrid/offline-sync`, and `@servicegrid/api-client`.

## 2. Module Structure
- **Entry & Navigation (`src/App.tsx`):** State-driven navigation across `BrandLoader` startup recovery, `LoginScreen`, `DashboardScreen`, `JobDetailsScreen`, `NavigationScreen`, and `SyncStatusScreen`.
- **Authentication & Secure Storage (`src/auth/`):**
  - `SecureTokenStorage` (`secure-storage.ts`): Abstraction bound to Android Keystore / EncryptedSharedPreferences in native builds, with `InMemorySecureStorage` for automated testing.
  - `MobileAuthService` (`mobile-auth.service.ts`): Login, session restoration with automatic `401` refresh rotation, device ID tracking, and logout with full local SQLite wipe.
- **API & Sync Transport (`src/api/mobile-sync-transport.ts`):**
  - `ApiSyncTransport` connects `OfflineSyncEngine` to `/api/v1/sync/assigned-jobs`, `/api/v1/sync/operations`, and `/api/v1/sync/attachments`.
- **Offline Storage & Sync Engine (`src/offline/`):**
  - `sqlite-schema.ts`: Indexed, tenant-scoped SQLite DDL (`local_customers`, `local_assets`, `local_jobs`, `local_checklists`, `local_job_history`, `sync_outbox`, `local_attachment_queue`, `local_sync_history`, `sync_metadata`).
  - `offline-sync-engine.ts`: Transaction-safe outbox queue, sequential ordering, exponential backoff, conflict resolution, attachment deduplication, and checklist template validation.
- **Android Platform Capabilities (`src/platform/android-capabilities.ts`):** Explicit evaluation of Android Doze/battery optimization, fine GPS vs manual Maps handoff, and notification permissions.
