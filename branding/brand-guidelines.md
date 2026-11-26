# FieldSutra Brand Guidelines

**Product Brand:** FieldSutra  
**Working / Engineering Namespace:** ServiceGrid (`@servicegrid/*`)  
**Category:** Field Service Operations Management SaaS

---

## 1. Brand Essence
FieldSutra connects every thread of field service operations—customers, dispatch, offline-first technicians, inventory, AMC contracts, and billing—with clarity, speed, and reliability.

- **Personality:** Dependable, structured, modern, calm under operational pressure.
- **Visual Direction:** Restrained Deep Navy, crisp Slate Neutrals, and Signal Teal. No decorative clutter or excessive gradients.

---

## 2. Logo System

The FieldSutra mark is a minimal geometric 2×2 operational grid with an active connected dispatch node in the top-right quadrant.

| Asset | File | Usage |
| :--- | :--- | :--- |
| Primary Horizontal | [logo-primary.svg](file:///e:/03%20Study/servicegrid/branding/logo-primary.svg) | Light backgrounds, marketing, docs |
| Light Variant | [logo-light.svg](file:///e:/03%20Study/servicegrid/branding/logo-light.svg) | Explicit light-surface header/login |
| Dark Variant | [logo-dark.svg](file:///e:/03%20Study/servicegrid/branding/logo-dark.svg) | Dark sidebars, dark mode, footer |
| Symbol-Only | [logo-icon.svg](file:///e:/03%20Study/servicegrid/branding/logo-icon.svg) | Collapsed sidebar, compact badges |
| Monochrome | [logo-monochrome.svg](file:///e:/03%20Study/servicegrid/branding/logo-monochrome.svg) | Invoices, print, single-ink stamps |
| Favicon | [favicon.svg](file:///e:/03%20Study/servicegrid/branding/favicon.svg) | Browser tab icon |
| App Icon | [app-icon.svg](file:///e:/03%20Study/servicegrid/branding/app-icon.svg) | Android adaptive/launcher icon |

### Clear Space & Minimum Size
- Maintain clear space equal to at least **0.5× the icon width** on all sides.
- Minimum horizontal logo width: **120px** (digital) / **32mm** (print).
- Minimum symbol-only size: **20px × 20px** (favicon/UI badge).

---

## 3. Color Palette

| Token | Hex | Role |
| :--- | :--- | :--- |
| `navy-950` | `#0B1120` | Dark surface background |
| `navy-900` | `#0F172A` | Primary headings, dark sidebar, primary brand ink |
| `teal-600` | `#0D9488` | Primary interactive accent, active states, CTA |
| `teal-500` | `#14B8A6` | Dark-mode accent, active node highlight |
| `slate-600` | `#475569` | Secondary body copy |
| `slate-200` | `#E2E8F0` | Hairline borders, table dividers |
| `slate-50` | `#F8FAFC` | App canvas background |
| `emerald-600` | `#059669` | Success / Completed / Synced |
| `amber-600` | `#D97706` | Warning / Pending / SLA at risk |
| `rose-600` | `#E11D48` | Error / Overdue / Cancelled |

---

## 4. Typography
- **UI Sans:** `Inter`, system-ui, `-apple-system`, `Segoe UI`, `Roboto`, sans-serif.
- **Monospace (IDs, GSTIN, SKUs, Invoice #):** `JetBrains Mono`, `Fira Code`, monospace.
- **Tabular Numerals:** Always use `font-variant-numeric: tabular-nums` for currency, KPIs, and tables.

---

## 5. Motion & Branded Loaders
Motion reflects precision dispatch: the 2×2 grid nodes pulse in sequence (`1.4s` ease-in-out) with full `prefers-reduced-motion` support and accessible `role="status"` / `aria-label` attributes.
