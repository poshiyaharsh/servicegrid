# Product Requirements Document (PRD) — ServiceGrid

**Phase:** 01 — Research and Product Discovery  
**Date:** 2026-11-26

---

## 1. Product Vision
ServiceGrid is a multi-tenant, commercial Field Service Operations Management SaaS built **India-first and global-ready**, uniting CRM, service requests, work orders, offline-first Android technician execution, dispatch, inventory/assets, GST/multi-currency billing, AMC management, WhatsApp-first communication, and workflow automation.

---

## 2. Core Functional Requirements (By Domain)

### 2.1 Multi-Tenancy, Auth & RBAC
- Tenant registration, email verification, login, logout, password reset, session management.
- Organization & branch management; user invitations.
- 9 system roles: Platform Super Admin, Organization Owner, Organization Admin, Operations Manager, Dispatcher, Technician, Accountant, Inventory Manager, Customer.
- Strict tenant isolation via `tenant_id` on all tenant-owned records + PostgreSQL Row-Level Security (RLS).

### 2.2 CRM & Customer Management
- Business & individual customer profiles, multiple contacts, multiple addresses.
- Leads, notes, tags, communication history, activity timeline, CSV import/export.
- Customer-owned assets and full historical service records.

### 2.3 Service Requests & Work Orders
- Manual and customer-portal service request creation with configurable categories, attachments, priority, and SLAs.
- Request-to-work-order conversion, multi-technician & multi-visit support.
- Validated state machine: `New -> Pending -> Scheduled -> Assigned -> En Route -> In Progress -> On Hold -> Completed / Cancelled` (plus controlled reopening).
- Job checklists, before/after photos, technician notes, customer approval/signature, and service reports.

### 2.4 Technician Mobile App (Android-First, Offline-First)
- React Native + TypeScript + local SQLite.
- Local download of assigned jobs and customer/asset context.
- Offline outbox with unique operation IDs, idempotent server sync, conflict detection, attachment upload queue, retry with backoff, and explicit sync status UI.
- Attendance, GPS navigation handoff, camera capture, voice notes, spare parts usage, and customer signature.

### 2.5 Scheduling & Dispatch
- Daily/weekly/monthly calendars and drag-and-drop dispatcher board.
- Technician skills, working hours, leave, availability, duration/travel estimation, emergency reassignment, geographic view, and route optimization.
- Assignment scoring (skill match, availability, distance, priority, SLA, required inventory) with manual dispatcher override.

### 2.6 Inventory & Asset Management
- Products, categories, SKU, barcode/QR, multi-warehouse + vehicle stock.
- Auditable stock movement ledger (no direct quantity mutation without a movement record), transfers, adjustments, purchase orders, suppliers, low-stock alerts.
- Equipment registration (manufacturer, model, serial number, install date, warranty, service/maintenance history).

### 2.7 Billing & Financial Operations
- Quotations/estimates with customer approval, invoice generation, line items, discounts, credit/debit notes, payments, reconciliation, expenses, technician commissions, PDF generation.
- India: GSTIN, HSN/SAC, CGST/SGST/IGST, Indian financial years, INR formatting, UPI, e-invoice/e-way bill readiness.
- Global: Multi-currency, regional tax config, fiscal calendars, international addresses.
- Decimal-only arithmetic; immutable finalized invoices; full financial audit trail.

### 2.8 AMC & Preventive Maintenance
- AMC contracts, pricing, start/end dates, covered equipment, visit frequency, idempotent recurring job generation, warranty tracking, renewal reminders, profitability.

### 2.9 Communication, Integrations & Automation
- Provider adapters for WhatsApp Business Platform (official APIs only), Email, SMS, Payment Gateway, Maps, S3-compatible storage, and Accounting export.
- Webhook verification, retries, delivery status, and integration health monitoring.
- Loop-safe Workflow Builder (Trigger, Condition, Action, Delay, Notification, Assignment, Approval).

### 2.10 Analytics, AI & Customer Portal
- Operational & financial dashboards (jobs, revenue, outstanding payments, first-time fix rate, CSAT, inventory, AMC renewals, branch performance).
- Configurable AI features (complaint classification/summarization, voice-to-request, suggested categories/parts, daily summaries, anomaly detection) with mandatory human approval for financial/completion decisions.
- Customer self-service portal for requests, tracking, estimate approval, invoices, payments, feedback, and warranty details.

---

## 3. Non-Functional Requirements
- **Security:** Input validation, SQLi/XSS/CSRF protection, rate limiting, signed upload URLs, encrypted connections/backups, audit logs, zero hardcoded secrets.
- **Reliability:** Idempotent APIs for sync, payments, and recurring AMC jobs; graceful offline/degraded-network handling.
- **Performance & UX:** Clean, minimal B2B SaaS UI with loading skeletons, empty states, error recovery, and accessible contrast.
- **Compliance & Maintainability:** TypeScript strict mode, database migrations, OpenAPI spec, automated unit/integration/E2E/tenant-isolation tests.
