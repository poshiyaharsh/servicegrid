# Competitor & Open-Source Analysis — ServiceGrid

**Phase:** 01 — Research and Product Discovery  
**Date:** 2026-11-26

---

## 1. Commercial Competitors Evaluated

### 1.1 Global & North American Leaders

| Platform | Target Segment | Pricing Model (Publicly Reported) | Core Strengths | Mobile & Offline | Key Customer Complaints & Gaps |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Zoho FSM** | SMBs, especially existing Zoho ecosystem users | Appointment/volume-tiered plans starting around \$25–\$30/month | Tight Zoho CRM/Books/Desk integration, work orders, drag-and-drop dispatch, native invoicing | Mobile app available; offline capabilities noted as limited | Rigid module layouts, steep workflow setup curve, consumption-limit surprises as volume grows |
| **Jobber** | Small-to-mid home/trade service teams | Flat tiered monthly plans (Core, Connect, Grow; ~\$90s–\$350+/month) | Clean UI, strong Client Hub portal, 2-way SMS, quoting follow-ups, QuickBooks sync | Good iOS/Android field app | Basic inventory & reporting for growing teams; limited email/invoice template customization |
| **Housecall Pro** | Home service contractors (HVAC, plumbing, electrical) | Tiered monthly plans (Basic, Essentials, MAX) + per-seat/add-on fees | Easy onboarding, GPS dispatch, automated review requests, online booking widget | Strong technician mobile app | Support wait times in peak season, features gated behind higher tiers, payment fee/lock-in friction |
| **ServiceTitan** | Large residential & commercial trade enterprises | Enterprise per-technician pricing (hundreds/tech/mo) + high setup fees | Deep marketing attribution, multi-warehouse inventory, call-booking analytics, pricebooks | Full-featured mobile suite | Prohibitive cost for SMBs, overwhelming complexity, long onboarding, rigid contracts |
| **Microsoft Dynamics 365 Field Service** | Large enterprises on Microsoft stack | ~\$105/user/mo (Full), ~\$50/contractor, ~\$8/team member + RSO add-on (~\$30/resource/mo) | Deep ERP/Dataverse integration, inspection forms, asset history, RSO scheduling | Offline-first via Mobile Offline Profiles (Dataverse local DB) | Offline profile scoping complexity, server-side plugins/Power Automate don't run offline, sync conflict/media bloat issues, very high TCO |

### 1.2 India-Focused & High-Growth Competitors

| Platform | Target Segment | Pricing Model (Publicly Reported) | Core Strengths | Mobile & Offline | Key Customer Complaints & Gaps |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Zuper** | Mid-market to enterprise trade & IT services | Quote-based per-user/month (annual billing, historically ~\$55–\$105+/user/mo) | 60+ integrations (HubSpot, QuickBooks, Zendesk), multi-warehouse & serial tracking, custom workflows | Offline mobile app for iOS & Android | Steep initial configuration learning curve; occasional sync lag on large work-order datasets |
| **Fieldproxy** | Agile field teams & deskless operations | Flat-rate by monthly job volume with **unlimited users** (Starter/Core/Growth/Scale) | AI Command Center/Autopilot, unified Front Desk inbox, QR asset tracking, rapid no-code workflows | Offline-capable native iOS/Android apps | Can be pricey for very small crews needing simple dispatch; occasional edge-case glitches reported |
| **FieldEZ** | Enterprise equipment & AMC-heavy Indian teams | Enterprise quote-based | Strong AMC, SLA, complaint logging, ERP/CRM integrations, affordable enterprise positioning | Android/iOS field app | Historical complaints of mobile app crashes/lag, high battery drain from GPS, occasional location sync gaps at job close |
| **FieldWeb** | Indian SMBs (appliance repair, local services) | Tiered quarterly/annual per-user plans | Simple UI, quick deployment, basic scheduling, GPS tracking, estimates/invoices | Mobile app for field status updates | Lacks deep custom automation, multi-tier routing, and granular financial/inventory reporting |
| **Dista (Dista Service)** | Large enterprises, BFSI, widespread service fleets | Enterprise quote-based (map/API usage dependent) | Google Maps-backed geospatial intelligence, AI auto-allocation, route optimization, geofencing | Field workforce mobile app | Cluttered/less intuitive UI, heavy technical onboarding due to complex AI/geo rules |

---

## 2. Open-Source Repositories Investigated

1. **`OCA/field-service` (Odoo Community Association)**
   - **License:** Primarily **AGPL-3.0** (copyleft — incompatible with closed-source commercial SaaS distribution without network-disclosure obligations).
   - **Architecture:** Modular monolithic addons on Odoo ERP (Python + PostgreSQL + Owl UI). Separates core dispatching from maintenance, inventory, equipment, timesheets, and route modules.
   - **Takeaway:** Strong domain separation (Equipment → Order → Maintenance/Stock), but tightly coupled to Odoo's ERP conventions and AGPL-3.0 licensed.

2. **`frappe/erpnext` (Frappe Framework)**
   - **License:** **GPL-3.0** (copyleft).
   - **Architecture:** Metadata-driven MVC ("DocTypes" defined in JSON) on Python/JS + MariaDB/PostgreSQL, managed via Bench. Field service is spread across Maintenance, Projects, Stock, and Assets (or third-party Frappe apps).
   - **Takeaway:** Excellent metadata/workflow flexibility, but not purpose-built offline-first for mobile technicians and carries GPL-3.0 obligations.

3. **`clawnify/OpenFieldService`**
   - **License:** Open-source (permissive ecosystem alignment).
   - **Architecture:** Lightweight modern stack (Preact, Hono, SQLite/Cloudflare D1) aimed at booking, scheduling, and lightweight automation.
   - **Takeaway:** Validates modern lightweight web/API ergonomics, though lacks deep India GST/AMC/multi-warehouse/offline-Android enterprise depth.

4. **`will-garrett/open-fsm`**
   - **Status:** No active public GitHub repository matched `will-garrett/open-fsm` during web discovery. Excluded from architectural borrowing.

---

## 3. Synthesis: Underserved Requirements & Differentiation Opportunities

1. **True Offline-First Android Reliability Without Battery/Crash Issues:** Indian technicians work in basements, rooftops, and tier-2/3 towns. Competitors either lack reliable offline sync (Zoho FSM, FieldWeb) or suffer battery drain/crashes (FieldEZ) or complex profile setup (Dynamics 365).
2. **India-Ready Service-to-Cash + AMC in One SMB-Friendly Package:** SMBs in AC, RO, CCTV, solar, and appliance repair need GSTIN/HSN/SAC/CGST-SGST-IGST invoicing, UPI collection, and recurring AMC preventive visits without paying ServiceTitan/Dynamics prices or enduring months of setup.
3. **WhatsApp-First Customer & Technician Loop:** Indian customers expect booking confirmations, technician ETA, estimates, invoices, and payment links on WhatsApp—not just email.
4. **Simple Onboarding for Non-Technical Owners:** Owners shouldn't need a consultant (unlike Zuper/Dista/Dynamics) to configure categories, checklists, and dispatch.
5. **Safe AI Assistance:** AI should classify complaints, summarize reports, and suggest spare parts—while keeping humans in control of billing, tax, and job closure.
