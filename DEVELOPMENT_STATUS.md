# Development Status — ServiceGrid

**Last Updated:** 2026-11-26  
**Current Phase:** Phase 14 — Customer Portal and Workflow Automation (Completed)  
**Next Phase:** Phase 15 — Security and Quality Assurance (Awaiting approval to proceed)

---

## Repository & Environment Baseline

- **Repository:** `servicegrid` (`main` branch)
- **Node.js:** `v24.13.0`
- **pnpm:** `9.15.0` (installed globally)
- **Docker:** `29.9.2` (running; PostgreSQL 16 & Redis 7 containers active)
- **Git:** `2.53.0.windows.2`
- **Commit Standard:** Conventional Commits 1.0.0 (`CONTRIBUTING.md`)
- **Security/Privacy:** `.gitignore` excludes `.env*` (except `.env.example`), secrets, keys, and internal prompt files (`MASTER_PROMPT.md`, `*PROMPT*.md`).

---

## Phase Progress Tracker

| Phase | Name | Status | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **01** | Research and Product Discovery | **Completed** | `COMPETITOR_ANALYSIS.md`, `CUSTOMER_PERSONAS.md`, `PRODUCT_REQUIREMENTS.md`, `PRODUCT_POSITIONING.md`, `MVP_SCOPE.md` |
| **02** | Brand Identity and Design System | **Completed** | Brand naming (`FieldSutra`), 7 SVG logos, design tokens, UI primitives, 5 loader variants |
| **03** | Architecture and Infrastructure | **Completed** | `pnpm` monorepo, Docker Compose, PostgreSQL + Prisma baseline, Redis, NestJS API + OpenAPI, 4 BullMQ workers, CI |
| **04** | Authentication and Multi-Tenancy | **Completed** | Auth, sessions, invitations, branches, users, 9-role RBAC, PostgreSQL RLS (`FORCE` + `servicegrid_app`), live DB + cross-tenant tests (5/5 pass) |
| **05** | CRM and Customer Management | **Completed** | Business/individual customers, contacts, addresses, leads, communications, timeline, assets, CSV import/export, RLS |
| **06** | Service Requests and Work Orders | **Completed** | Categories/SLA, manual & portal intake, conversion, 9-status state machine, multi-tech/visits, checklists, photos, reports, RLS |
| **07** | Technician Mobile Application | **Completed** | 15 Android-first screens, SQLite DDL & offline outbox engine, Android OS handlers, idempotent Sync API, offline/conflict/restart tests |
| **08** | Scheduling and Dispatch | **Completed** | Daily/weekly/monthly board, skills/leave/hours availability, 6-factor scoring, manual override, emergency reassign, route optimization |
| **09** | Inventory and Asset Management | **Completed** | Products/SKU/barcode/QR, warehouses & vehicle stock, auditable movement ledger, transfers, POs, suppliers, low-stock alerts, RLS |
| **10** | Billing and Financial Operations | **Completed** | Estimates, GST/multi-currency invoices, BigInt decimal math, immutable finalized invoices, credit/debit notes, UPI sandbox, audit log, RLS |
| **11** | AMC and Maintenance | **Completed** | AMC contracts, equipment coverage, preventive schedules, idempotent visit generation, renewals, cancellation, profitability, RLS |
| **12** | Communication and Integrations | **Completed** | Provider adapters (WhatsApp, Email, SMS, Payment, Maps, S3, Accounting), templates, delivery/failed logs, HMAC webhooks, health, RLS |
| **13** | Analytics and AI Intelligence | **Completed** | Operational & financial KPI dashboards, configurable AI provider + deterministic fallback, human-approval guardrails |
| **14** | Customer Portal and Workflow Automation | **Completed** | Customer portal APIs/UI, workflow builder, condition evaluator, loop-safe execution (`BLOCKED_LOOP`), feedback, RLS |
| **15** | Security and Quality Assurance | Pending | Unit/E2E/offline/tenant-isolation/load tests, vuln scan |
| **16** | Production Deployment and Launch | Pending | Prod Docker, Nginx, TLS, backups, SaaS subscriptions |

---

## Phase 01 Summary & Known Limitations

- **Completed:**
  - Configured `.gitignore` to protect sensitive files and internal prompts.
  - Documented Conventional Commits standard in `CONTRIBUTING.md`.
  - Created `DEVELOPMENT_STATUS.md` and `TECHNICAL_DECISIONS.md`.
  - Completed competitive research across 10 FSM platforms and 4 open-source references (`COMPETITOR_ANALYSIS.md`).
  - Defined 6 core customer/user personas (`CUSTOMER_PERSONAS.md`), functional/non-functional requirements (`PRODUCT_REQUIREMENTS.md`), market positioning (`PRODUCT_POSITIONING.md`), and phased MVP scope (`MVP_SCOPE.md`).
- **Known Limitations / Notes:**
  - `pnpm` is not yet installed in the local shell environment; will be enabled/installed in Phase 03.
  - `will-garrett/open-fsm` had no active public GitHub repository match during search and is noted as unavailable in `COMPETITOR_ANALYSIS.md`.
  - Competitor pricing figures are compiled from public listings and third-party review aggregators and may vary by region or custom enterprise quotes.
