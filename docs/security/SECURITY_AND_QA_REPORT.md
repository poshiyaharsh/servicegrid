# Security & Quality Assurance Report — FieldSutra (ServiceGrid)

**Phase:** 15 — Security and Quality Assurance  
**Date:** 2026-11-26

---

## 1. Security Controls Implemented
- **Authentication & Sessions:** `scrypt` password hashing with `timingSafeEqual`, HMAC-SHA256 JWTs, SHA-256 hashed refresh/reset/verification/invitation tokens, and revocable session records.
- **Tenant Isolation:** `tenant_id` on every tenant-owned table, `JwtAuthGuard` rejecting spoofed `x-tenant-id` headers (`403 Forbidden`), and PostgreSQL `FORCE ROW LEVEL SECURITY` policies enforced under non-superuser `servicegrid_app` role.
- **RBAC:** 9-role permission matrix enforced via `PermissionsGuard` (`@RequirePermissions`).
- **HTTP Security Headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Content-Security-Policy` via `securityHeadersMiddleware`.
- **Rate Limiting:** `RateLimitGuard` returning `429 Too Many Requests` when per-IP/route window is exceeded.
- **File Upload Validation:** `validateUploadMetadata` enforcing MIME allowlist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `audio/mp4`, `audio/mpeg`), 10 MB max size, and path-traversal/filename sanitization, paired with signed upload URLs.
- **Financial & Audit Integrity:** `BigInt` decimal arithmetic, immutable finalized invoices, and `financial_audit_logs`.

---

## 2. Verification Results Observed

| Check | Scope | Result | Notes |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Check** | All 15 workspace projects (`pnpm typecheck`) | **Passed** | Zero type errors |
| **API Production Build** | `apps/api` (`nest build`) | **Passed** | Clean compilation |
| **API Unit, Integration, RLS, E2E & Load Tests** | `apps/api` (`pnpm test`) | **20/20 Passed (14 suites)** | Includes live PostgreSQL RLS (`42501` block) & 200-req concurrent HTTP burst |
| **Mobile Offline-First Sync Tests** | `apps/mobile` (`pnpm test`) | **1/1 Passed** | Covers online, offline, interrupted sync, duplicates, conflicts, app restart |
| **Backup & Restore Recovery** | `servicegrid-postgres` (`pg_dump` + `pg_restore`) | **Passed** | Restored 56 public tables into `servicegrid_restore_test` cleanly |
| **Dependency Vulnerability Scan** | `pnpm audit --prod --audit-level=high` | **32 Vulnerabilities Found** | 2 low, 13 moderate, 17 high (primarily transitive `multer@2.0.2` / `body-parser@1.20.4` via `@nestjs/platform-express@10.4.22`); requires NestJS 11 / Express 5 upgrade or pnpm overrides before GA |

---

## 3. Known Gaps Before General Availability
1. Resolve the 17 high / 13 moderate transitive dependency advisories (`multer`, `body-parser`) via NestJS/Express upgrade or `pnpm.overrides` and re-run `pnpm audit --prod`.
2. Configure production TLS termination, encrypted off-site `pg_dump` backups, and automated retention cron jobs in Phase 16.
