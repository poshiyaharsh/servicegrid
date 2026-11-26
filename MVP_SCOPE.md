# MVP Scope & Phased Rollout Plan — ServiceGrid

**Phase:** 01 — Research and Product Discovery  
**Date:** 2026-11-26

---

## 1. Commercial MVP Definition
The Minimum Viable Commercial Product (MVCP) is the smallest complete, secure, and reliable product that an AC/appliance/RO/CCTV/solar/facility maintenance business in India can pay for and run daily operations on end-to-end.

### Included in Core Commercial MVP (Phases 02–11 + 15–16 Essentials)
1. **Brand & Design System (Phase 02):** Final brand identity, SVG logos, design tokens, custom branded loaders.
2. **Platform Foundation (Phase 03):** `pnpm` monorepo, Docker Compose, PostgreSQL, Redis, BullMQ, CI, OpenAPI, structured logging.
3. **Multi-Tenant Auth & RBAC (Phase 04):** Registration, login, org/branch setup, 9 roles, strict `tenant_id` + PostgreSQL RLS.
4. **CRM & Assets (Phase 05):** Customers (business/individual), contacts, addresses, customer equipment/assets, service history.
5. **Service Requests & Work Orders (Phase 06):** Request intake, SLA/priority, work order state machine, checklists, before/after photos, customer signature, service report.
6. **Offline-First Android App (Phase 07):** React Native + SQLite outbox sync, job list, checklist, camera, spare parts usage, signature, sync status.
7. **Scheduling & Dispatch (Phase 08):** Daily/weekly calendar, dispatch board, skill/availability-checked assignment with manual override.
8. **Inventory & Assets (Phase 09):** Warehouses, vehicle stock, auditable stock movement ledger, low-stock alerts, equipment warranty tracking.
9. **GST & Multi-Currency Billing (Phase 10):** Estimates, GST invoices (GSTIN, HSN/SAC, CGST/SGST/IGST), decimal math, immutable finalized invoices, sandbox payment recording, PDF generation.
10. **AMC & Preventive Maintenance (Phase 11):** AMC contracts, equipment coverage, idempotent recurring visit generation, renewal alerts.
11. **Security, QA & Launch Readiness (Phases 15–16):** Automated unit/integration/offline/tenant-isolation tests, production Docker/Nginx/TLS, backups, SaaS plans/trials.

### Post-MVP Expansion Modules (Phases 12–14)
- **Phase 12:** Full multi-channel provider adapters (WhatsApp Business templates/webhooks, SMS, live payment gateways, maps, accounting export). *(Note: Core notification interfaces and sandbox adapters are wired early; full multi-provider suite completes in Phase 12.)*
- **Phase 13:** Advanced analytics dashboards and configurable AI intelligence (complaint classification, voice-to-request, summaries, anomaly detection).
- **Phase 14:** Self-service Customer Portal and visual Workflow Automation builder.

---

## 2. Out of Scope for Initial Launch
- Native iOS offline build (Android-first for Phase 07; iOS follows after Android stabilization).
- Microservices split (modular monolith + workers only).
- Unofficial/scraping WhatsApp automation (strictly prohibited).
- Autonomous AI financial/tax/job-closure execution.
