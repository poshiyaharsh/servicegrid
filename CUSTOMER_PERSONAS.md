# Customer Personas — ServiceGrid

**Phase:** 01 — Research and Product Discovery  
**Date:** 2026-11-26

---

## Persona 1: Rajesh — Business Owner (AC & Appliance Repair, 8–25 Technicians)
- **Demographics:** Age 32–48, Tier-1/Tier-2 city in India (e.g., Pune, Ahmedabad, Bengaluru, Jaipur). Manages 1–3 branches.
- **Current Tools:** WhatsApp groups, Excel/Google Sheets, Tally for GST accounting, paper job cards.
- **Goals:** Stop losing leads, know which jobs are pending/completed daily, collect payments faster, renew AMC contracts on time, reduce spare-part pilferage.
- **Pain Points:** Technicians forget to log parts used; customers call repeatedly asking "where is the technician?"; GST invoices are delayed until month-end; complex enterprise software takes too long to learn.
- **What Wins Rajesh:** 15-minute onboarding, WhatsApp notifications to customers, clear daily revenue/outstanding dashboard, GST + UPI invoicing, AMC renewal alerts.

## Persona 2: Priya — Dispatcher / Operations Coordinator
- **Demographics:** Age 24–35, works at the office handling 30–120 service requests/day.
- **Current Tools:** Phone calls, WhatsApp, whiteboards, spreadsheets.
- **Goals:** Assign the right skilled technician near the customer, meet SLA deadlines, handle emergency reassignments smoothly.
- **Pain Points:** Double-booking technicians, not knowing who has the required spare part in their vehicle, wasting hours calling technicians for status updates.
- **What Wins Priya:** Drag-and-drop dispatch board with skill/availability/distance visibility, instant status updates from mobile, SLA breach warnings.

## Persona 3: Vikram — Field Technician (Android-First)
- **Demographics:** Age 21–38, uses a budget/mid-range Android smartphone, comfortable with WhatsApp and UPI apps, prefers simple visual UI (often English + regional comfort).
- **Current Tools:** Phone calls from dispatcher, paper checklists, WhatsApp photos.
- **Goals:** See today's jobs clearly, navigate to customer location, finish checklist/photos/signature quickly, record spare parts without typing essays.
- **Pain Points:** Apps that hang or lose entered data in basements/no-signal areas; heavy battery drain; complicated multi-screen forms.
- **What Wins Vikram:** Fast offline-first Android app that queues photos/updates reliably in SQLite and syncs automatically, 1-tap status updates, QR/barcode part scan, voice notes.

## Persona 4: Anita — Accountant / Billing Manager
- **Demographics:** Age 27–45, manages invoicing, GST compliance, technician commissions, and vendor bills.
- **Current Tools:** Tally, Excel, bank statements.
- **Goals:** Accurate CGST/SGST/IGST & HSN/SAC invoices, zero mismatch between parts consumed and billed, clean payment reconciliation, immutable audit trail.
- **Pain Points:** Technicians quote wrong prices or forget to collect; manual re-entry of job sheets into accounting software; accidental edits to already-sent invoices.
- **What Wins Anita:** Estimate-to-invoice conversion, locked finalized invoices with credit/debit notes, UPI/payment reconciliation, Tally-ready exports.

## Persona 5: Suresh — Inventory & Warehouse Manager
- **Demographics:** Age 26–42, manages main store + spare parts issued to technician vans/bags.
- **Current Tools:** Stock register, spreadsheets.
- **Goals:** Know exact stock across warehouse and technician kits, prevent stockouts on fast-moving parts (capacitors, RO filters, CCTV cameras), track warranty/serial numbers.
- **Pain Points:** "Ghost inventory" where parts are used on jobs without stock deduction; no audit trail for adjustments.
- **What Wins Suresh:** Auditable stock movement ledger, warehouse-to-technician transfers, low-stock alerts, barcode/QR scanning.

## Persona 6: Meera — End Customer (Residential & Commercial Facility Manager)
- **Demographics:** Homeowner or office facility manager with an AMC or one-off repair request.
- **Goals:** Easy booking, transparent estimate approval, live technician arrival clarity, digital service report & GST invoice, warranty tracking.
- **Pain Points:** No confirmation after calling, surprise charges, lost paper warranty/AMC records.
- **What Wins Meera:** WhatsApp updates + self-service Customer Portal to raise requests, approve estimates, view service history, and pay online.
