# FieldSutra — Mobile Security Review

**Date:** 2026-11-26  
**Scope:** `apps/mobile` authentication, token storage, offline cache, sync API authorization, and location privacy.

## 1. Security Controls Verified
- **Token Storage:** `MobileAuthService` uses `SecureTokenStorage` (designed for Android Keystore / EncryptedSharedPreferences; `InMemorySecureStorage` for tests). Tokens are never stored in unencrypted `AsyncStorage` or plaintext files.
- **Session Expiration & Refresh:** Expired `accessToken` triggers a single-flight `refreshToken` exchange; if refresh fails, tokens are cleared and `onSessionExpired` returns the user to `LoginScreen`.
- **Minimal Tenant-Scoped Offline Cache:** `GET /api/v1/sync/assigned-jobs` restricts `TECHNICIAN` role downloads to only work orders assigned to `user.userId` and only the customer/address/asset fields needed for those jobs. Unrestricted organization data is never cached.
- **Cross-Tenant & Assignment Enforcement:** `OfflineSyncEngine` rejects cross-tenant mutations/attachments locally, and `SyncService` enforces `tenantId` scoping + technician assignment checks (`FORBIDDEN` if unassigned).
- **Attachment Validation:** `SyncService.registerAttachment` and `processBatch` validate MIME allowlist, file size, and sanitized filenames via `validateUploadMetadata`.
- **Location Privacy:** `NavigationScreen` and `queueLocationEvent` record coordinates only when explicitly authorized for discrete job events (`ARRIVED`, `JOB_STARTED`, `JOB_COMPLETED`) — no continuous background tracking.
- **Logout Cleanup:** `MobileAuthService.logout` revokes the server session, clears `SecureTokenStorage`, and invokes `wipeAllOnLogout()`.

## 2. Residual Native Risks (Before Play Store Release)
- Bind `SecureTokenStorage` to a native Android Keystore module (e.g., `react-native-keychain`) and `LocalDatabaseState` to an encrypted SQLite driver (`react-native-quick-sqlite` / SQLCipher) when generating the native `android/` Gradle project.
