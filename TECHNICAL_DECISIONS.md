# Technical Decisions Log — ServiceGrid

This document records key architectural, security, and product engineering decisions for ServiceGrid.

---

## TD-001: Commit Standard & Repository Hygiene
- **Date:** 2026-11-26
- **Decision:** Enforce Conventional Commits 1.0.0 (`CONTRIBUTING.md`) and exclude all sensitive files, environment secrets (`.env*` except `.env.example`), and internal prompt files (`MASTER_PROMPT.md`, `*PROMPT*.md`) via `.gitignore`.
- **Rationale:** Keeps git history machine-readable for changelogs/CI and prevents accidental exposure of credentials or internal engineering prompts on public or shared remotes.

## TD-002: Modular Monolith Architecture (Initial)
- **Date:** 2026-11-26
- **Decision:** Build the backend as a NestJS modular monolith (`apps/api`) with dedicated background workers (`services/*-worker`) backed by PostgreSQL, Prisma ORM, Redis, and BullMQ.
- **Rationale:** Avoids premature microservice operational overhead while preserving clean domain boundaries (Auth, CRM, Work Orders, Dispatch, Inventory, Finance, AMC, Notifications, Workflows) that can be extracted later if scale demands.

## TD-003: Multi-Tenancy & PostgreSQL Row-Level Security (RLS)
- **Date:** 2026-11-26
- **Decision:** Enforce `tenant_id` on every tenant-owned table, pair application-level tenant guards with PostgreSQL Row-Level Security (RLS), and never trust client-supplied tenant IDs without server-side authorization.
- **Rationale:** Defense-in-depth prevents cross-tenant data leakage even in the event of an application query bug.

## TD-004: Offline-First Mobile Sync via SQLite & Idempotent Outbox
- **Date:** 2026-11-26
- **Decision:** Use React Native (Android-first) with local SQLite storage, an operation outbox, client-generated unique operation IDs (`idempotency_key`), and explicit conflict detection on the server.
- **Rationale:** Field technicians in India frequently work in basements, rooftops, rural areas, and low-connectivity zones. Idempotent APIs prevent duplicate job updates, part deductions, or photo uploads on flaky networks.

## TD-005: Decimal-Only Financial Arithmetic & Immutable Invoices
- **Date:** 2026-11-26
- **Decision:** Store and compute all monetary values using PostgreSQL `DECIMAL`/`NUMERIC` types and exact decimal arithmetic; prohibit floating-point math for billing/tax; treat finalized invoices as immutable (adjustments only via credit/debit notes).
- **Rationale:** Prevents rounding drift in GST (CGST/SGST/IGST) and multi-currency calculations and maintains a compliant financial audit trail.

## TD-006: Monorepo Tooling (`pnpm`)
- **Date:** 2026-11-26
- **Decision:** Use `pnpm` workspaces for the monorepo (`apps/*`, `packages/*`, `services/*`).
- **Rationale:** Strict dependency isolation, fast installs, and clean shared-package linking across web, mobile, API, and workers.


## TD-007: Product Brand Selection — FieldSutra
- **Date:** 2026-11-26
- **Decision:** Adopt **FieldSutra** as the commercial product brand while keeping `servicegrid` / `@servicegrid/*` as the internal monorepo and package namespace.
- **Rationale:** Evaluated 22 candidates across 9 criteria (`docs/brand/BRAND_NAME_RESEARCH.md`). FieldSutra scored highest (44/45), carries strong India + global resonance, and had no active competing FSM SaaS found in preliminary web screening. Formal domain/trademark registration checks remain required prior to public launch.


## TD-008: Compiled UI Package Boundary (`@servicegrid/ui`)
- **Date:** 2026-11-26
- **Decision:** Build `@servicegrid/ui` to `dist/` with TypeScript declaration files (`.d.ts`) rather than exporting raw `.tsx` source directly across pnpm workspace symlinks.
- **Rationale:** Prevents cross-package `@types/react` resolution conflicts in strict `pnpm` monorepos when `apps/web` (React 19 / Next.js) and `apps/mobile` (React 18 / React Native) coexist.


## TD-009: Scrypt Password Hashing, HMAC-SHA256 JWT & RLS Context Helper
- **Date:** 2026-11-26
- **Decision:** Use Node.js built-in `crypto.scrypt` with `crypto.timingSafeEqual` for passwords, HMAC-SHA256 JWTs for access/refresh tokens, SHA-256 hashes for persisted refresh/reset/verification/invitation tokens, and `withTenantTransaction` (`SELECT set_config('app.current_tenant_id', $1, true)`) to enforce PostgreSQL Row-Level Security (RLS).
- **Rationale:** Avoids native C++ addon build fragility on Windows while maintaining strong cryptographic standards and defense-in-depth tenant isolation across both NestJS guards (`JwtAuthGuard`) and PostgreSQL RLS policies.
