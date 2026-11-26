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
