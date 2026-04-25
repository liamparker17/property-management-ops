# Dashboard Analytics — Design Spec

**Status:** Draft for review
**Date:** 2026-04-25
**Owner:** Liam Parker
**Scope:** Staff `/dashboard` (Overview + 6 deep-dive tabs). Reusable analytics layer that landlord and agent dashboards will compose from later.

## Goal

A one-stop analytics command centre for property managers. The first three seconds tell them where the business stands; the next three minutes drill into anything that matters. Vibe blends boardroom polish (hero band), living portfolio map (geo hero band), and cockpit density (lower grid).

Positioning: **"Your rental portfolio at a glance: income, arrears, occupancy, maintenance, and risk — all in one command centre."**

## Existing implementation audit (added 2026-04-25 after manifest re-check)

The original draft of this spec was written assuming greenfield. A code audit found a substantial analytics foundation already shipped. The plan in this spec must build on it, not replace it.

### Already exists
- **KPI registry:** `lib/analytics/kpis.ts` — 14 KPIs (`OCCUPANCY_PCT`, `ARREARS_CENTS`, `COLLECTION_RATE`, `TRUST_BALANCE`, `UNALLOCATED_CENTS`, `OPEN_MAINTENANCE`, `EXPIRING_LEASES_30`, `BLOCKED_APPROVALS`, `GROSS_RENT`, `DISBURSED_CENTS`, `MAINTENANCE_SPEND`, `VACANCY_DRAG`, `AGENT_OPEN_TICKETS`, `AGENT_UPCOMING_INSPECTIONS`) with `KpiDefinition { id, label, eyebrow, sources, formula, drillTarget, comparisonMode, format }`.
- **Formatters / chart theme / drill-targets:** `lib/analytics/{formatters,drill-targets,chart-theme}.ts`.
- **Components:** `components/analytics/{kpi-tile,ranked-list,status-strip,empty-metric}.tsx` and `components/analytics/charts/{area-chart,bar-chart,donut-chart,trend-card}.tsx` and `components/analytics/maps/{map-panel,portfolio-pins}.tsx`. `KpiTile` already renders prior-period delta % and a drill link.
- **Services:** `lib/services/{staff,landlord,agent,tenant}-analytics.ts`. Staff exports `getStaffCommandCenter`, `getStaffPortfolio`, `getStaffFinance`, `getStaffMaintenance`, `getStaffOperations`. Returns include `kpis`, `priorKpis`, `collectionsTrend`, `maintenanceByStatus`, `portfolioPins`, `expiringLeases`, `topArrears`, `openMaintenance`, `blockedApprovals`. Snapshot reads with lazy recompute on miss.
- **Routes:** `/dashboard` and 4 sub-tabs `/dashboard/{finance,portfolio,operations,maintenance}` already render.
- **Snapshots service:** `lib/services/snapshots.ts` — recompute helpers per scope.

### Tile-by-tile gap status

| # | Tile | Status |
|---|---|---|
| 1 | Net rental income | **gap** — KPI id not in registry; need new id derived from snapshots `collectedCents - disbursedCents - maintenanceSpendCents` (or chosen formula) |
| 2 | Rent billed | **gap** — `GROSS_RENT` exists but is gross; `RENT_BILLED` from `OrgMonthlySnapshot.billedCents` is missing as a KPI id |
| 3 | Rent collected | **gap** — `OrgMonthlySnapshot.collectedCents` not surfaced as a KPI id |
| 4 | Collection rate | **exists** (`COLLECTION_RATE`) |
| 5 | Occupancy | **exists** (`OCCUPANCY_PCT`) |
| 6 | Total arrears | **exists** (`ARREARS_CENTS`) |
| 7 | Trust balance | **exists** (`TRUST_BALANCE`) |
| 8 | Invoiced vs Collected combo | **partial** — currently rendered as two-series `AreaChart`; need a `ComboChart` line+bars and a prior-period faded overlay |
| 9 | Arrears aging horizontal stacked bar | **partial** — `getStaffFinance` returns `arrearsBuckets` as `ChartPoint[]` rendered with `BarChart`; need a horizontal stacked single-bar primitive |
| 10 | Occupancy donut | **partial** — `DonutChart` exists; not currently used on Overview |
| 11 | Lease expiry buckets stacked bar | **partial** — `expiringLeases` list exists; need stacked-bar visual over 0–30/31–60/61–90/>90 |
| 12 | Maintenance spend 12-mo line | **gap** — `MAINTENANCE_SPEND` KPI id exists; trend series for it doesn't |
| 13 | Open urgent maintenance | **gap** — `OPEN_MAINTENANCE` exists; urgent-only count is missing |
| 14 | Utility recovery / shortfall | **gap** — no service surface; spec accepts `billed − collected` proxy until `MunicipalBill` lands |
| 15 | Top 10 overdue tenants | **partial** — `topArrears` `RankedList` exists; spec wants table with mini-bars |
| 16 | Property health ranking | **partial** — Portfolio page shows table with occupancy/maint/arrears; no composite score, no Map↔Table toggle |
| Map hero band | **partial** — `MapPanel` + `PortfolioPins` exist; pins not coloured by composite health; no side-panel drill on click |

### Sibling tab status

| Tab | Route | Status |
|---|---|---|
| Overview | `/dashboard` | exists (hero KPI tiles + 2 trend cards + 2 ranked lists + map panel) — needs hero re-curation, ComboChart, sparklines |
| Money | `/dashboard/finance` | exists; rename to `/dashboard/money` deferred (keep `finance` to avoid breaking links) |
| Properties | `/dashboard/portfolio` | exists; rename to `/dashboard/properties` deferred |
| Operations | `/dashboard/operations` | exists |
| Maintenance | `/dashboard/maintenance` | exists (note: spec has 7 tabs incl. Maintenance separate; actual code has Maintenance separate too — keep) |
| Tenants | `/dashboard/tenants` | **missing** |
| Utilities | `/dashboard/utilities` | **missing** |
| Trust | `/dashboard/trust` | **missing** (root `/trust` route exists for ops, but not analytics) |

Tab routes in the spec called them `/dashboard/money` / `/dashboard/properties`. The existing code uses `/dashboard/finance` and `/dashboard/portfolio`. **Decision: keep existing route names** to avoid breaking existing nav and bookmarks; the tab labels can still read "Money" and "Properties" without changing the URL slug.

### Service architecture decision (revised)

The spec proposed splitting into `lib/services/analytics/{hero,money,portfolio,operations,...}.ts`. The existing code is already split by **role** (`staff/landlord/agent/tenant-analytics.ts`), each ~200–700 lines and self-contained. Two viable paths:

- **(a) Add to existing role-scoped files.** Extend `staff-analytics.ts` with new exports for missing tiles. Pros: matches established convention; one place to reason about staff. Cons: file already 724 lines; will grow.
- **(b) Introduce `lib/services/analytics/<section>.ts` modules and delegate from `staff-analytics.ts`.** Pros: bounded files per spec; reusable for landlord/agent. Cons: two layers of indirection.

**Decision: hybrid.** Keep `staff-analytics.ts` as the page entry point (it stays the single import in pages). Extract reusable section helpers under `lib/services/analytics/` only when a function is needed across role services or when a section grows complex. Phase 1 only adds two helpers — `lib/services/analytics/hero-kpis.ts` and `lib/services/analytics/combo-chart-series.ts` — and threads them into `staff-analytics.ts`.

## Revised Phase 1 scope

Given the audit, Phase 1 narrows from "build the foundation" to **"close the hero-band gap and add filter/tab plumbing":**

1. Extend KPI registry with `NET_RENTAL_INCOME`, `RENT_BILLED`, `RENT_COLLECTED`, `URGENT_MAINTENANCE` (Phase 1 only needs 1–3; #4 is a Phase 2 prep).
2. Add `KpiTile` `sparkline` prop (renders mini gradient area; backed by a 12-month series passed in).
3. Add `ComboChart` primitive (line + bars on shared X, optional prior-period faded series).
4. Replace Overview hero block with curated 7-tile band using new KPI ids and sparklines.
5. Replace `AreaChart` "Billed vs Collected" on `/dashboard` Overview with `ComboChart`.
6. Filter URL contract: `lib/analytics/ctx.ts` → `AnalyticsCtx` + `resolveAnalyticsCtx(searchParams)` with Zod parser. Thread into `getStaffCommandCenter` (and Finance) as a `filters` extension. Defaults match current behaviour.
7. `components/analytics/dashboard-shell.tsx` — sticky 7-tab horizontal bar + filter bar. Used by all 7 dashboard routes.
8. Stub `/dashboard/{tenants,utilities,trust}` pages: PageHeader + "Coming in Phase 4" empty card. Tabs become navigable.

Phase 2 picks up arrears aging horizontal bar, lease expiry buckets stacked bar, utility recovery tile, top-10 overdue mini-bars, property health composite score, map↔table toggle, drill-in drawer framework.

## Curated tile inventory (Overview, 16 tiles)

### Hero band (7 KPI tiles, always visible)
1. Net rental income — value + delta + 12-mo area spark
2. Rent billed — value + delta
3. Rent collected — value + delta
4. Collection rate — % + sparkline
5. Occupancy — % + delta
6. Total arrears — value + delta (red on increase)
7. Trust balance — value + sparkline

### Main charts
8. Invoiced vs Collected — combo line+bars, 12 months (full width)
9. Arrears aging — horizontal stacked bar 0–30 / 31–60 / 61–90 / 90+
10. Occupancy breakdown — donut: occupied / vacant / notice given
11. Lease expiry buckets — stacked bar 0–30 / 31–60 / 61–90 / >90 days
12. Maintenance spend — line, last 12 months
13. Open urgent maintenance — KPI tile + linked list
14. Utility recovery / shortfall — billed vs collected (proxy until municipal-bill capture lands)
15. Top 10 overdue tenants — table with mini-bars
16. Property health ranking — sortable table OR Map view (toggle)

### Map hero band
A 480px-tall band between the combo chart and the lower grid. Pins coloured by composite health score. `Map · Table` toggle in the top-right; the Property Health Ranking (#16) is the table view. Clicking a pin opens a side-panel with that property's KPIs and a deep-link to its property page.

## Routes & tabs

```
/dashboard                  Overview (the 16 tiles)
/dashboard/money            Income mix, cashflow waterfall, full overdue, allocations
/dashboard/properties       Full map + ranking + occupancy/expiry/vacancy detail
/dashboard/operations       Maintenance funnel, SLA breach, vendor breakdown, repeat-issues heatmap
/dashboard/tenants          Applications funnel, TPN, affordability, source mix
/dashboard/utilities        Recovery, consumption, anomalies, tariff coverage
/dashboard/trust            Trust balance per landlord, reconciliation, audit volume
```

Each is a sibling route; tabs render as a sticky horizontal bar at the top.

## Filter contract (URL search params)

| Param | Values | Default |
|---|---|---|
| `range` | `1m` `3m` `12m` `ytd` or `from=YYYY-MM-DD&to=YYYY-MM-DD` | `12m` |
| `compare` | `prior` `yoy` `off` | `prior` |
| `properties` | comma-separated property ids | (all) |
| `landlords` | comma-separated landlord ids | (all) |
| `agents` | comma-separated agent ids | (all) |
| `view` | `map` `table` (Section 3 toggle) | `map` |
| `drill` | tile id of open drawer (e.g. `money.invoiced-vs-collected`) | (none) |

All filter UI is client components that update URL via `router.replace`. Server Component pages read `searchParams` and resolve `AnalyticsCtx`. No client-side filter state.

## Architecture

### Approach
Sectioned services + parallel server-side fetch. Each section has its own service module exporting pure functions over a shared `AnalyticsCtx`. Page is a Server Component that fans out via `Promise.all` and hydrates the tree once.

### Shared types
```ts
// lib/services/analytics/types.ts
export type DateRange = { from: Date; to: Date };
export type CompareMode = "prior" | "yoy" | "off";
export type Scope = {
  propertyIds?: string[];
  landlordIds?: string[];
  agentIds?: string[];
};
export type AnalyticsCtx = {
  orgId: string;
  range: DateRange;
  compare: CompareMode;
  scope: Scope;
};
```

`resolveAnalyticsCtx(searchParams, orgCtx)` in `lib/services/analytics/ctx.ts` parses URL params (Zod) and builds the ctx. Bad params fall back to defaults rather than throwing.

### Service modules
| File | Exports | Backing data |
|---|---|---|
| `lib/services/analytics/hero.ts` | `getHeroKpis(ctx)` | live aggregates over `Invoice`, `PaymentReceipt`, `Lease`, `Unit`, `TrustLedgerEntry` |
| `lib/services/analytics/money.ts` | `getInvoicedVsCollected`, `getArrearsAging`, `getTopOverdue`, `getIncomeMix`, `getCashflowWaterfall` | snapshots for trends, live for current month + drill tables |
| `lib/services/analytics/portfolio.ts` | `getOccupancyBreakdown`, `getLeaseExpiryBuckets`, `getVacancyDays`, `getRenewalRate`, `getPropertyHealthRanking`, `getMapPins` | live (Lease, Unit, Property) + Property snapshots for trend per pin |
| `lib/services/analytics/operations.ts` | `getOpenMaintenance`, `getUrgentMaintenance`, `getMaintenanceSpend`, `getSlaBreach`, `getRepeatIssues` | live (`MaintenanceRequest`, `MaintenanceQuote`) |
| `lib/services/analytics/tenants.ts` | `getApplicationsFunnel`, `getTpnStatus`, `getAffordability`, `getApplicantSource` | live (`Application`, `TpnCheck`, `Applicant`) |
| `lib/services/analytics/utilities.ts` | `getUtilityRecovery`, `getUtilityConsumption`, `getTopConsumers`, `getTariffCoverage`, `getAnomalies` | live + `MeterReading`, `UtilityTariff`, `UsageAlertEvent` |
| `lib/services/analytics/trust.ts` | `getTrustBalancePerLandlord`, `getReconciliationStatus`, `getAuditVolume` | live (`TrustLedgerEntry`, `ReconciliationRun`, `AuditLog`) |

### Snapshot vs live
- **Historical trends (months prior to current):** read from `OrgMonthlySnapshot`, `PropertyMonthlySnapshot`, `LandlordMonthlySnapshot`, `AgentMonthlySnapshot`. Indexed, single query per chart.
- **Current-month + "today" KPIs:** live aggregates over base tables. Where the snapshot job has equivalent SQL, the live function reuses it via a shared helper to avoid drift.
- **Compare mode:** when `compare !== 'off'`, every trend service runs a second range query and returns both series. The combo chart additionally renders a faded prior-period series.
- **Map pins:** live property aggregate joined with rolling-12 snapshot for trend.

### Caching
Each service wraps queries in Next 16 `'use cache'`:
- `cacheLife({ stale: 60, revalidate: 300 })` for trend/snapshot reads
- `cacheLife({ stale: 30, revalidate: 60 })` for hero KPIs
- `cacheTag('org:<orgId>:analytics:<section>')` per section

Mutations call `updateTag` from inside the existing service mutation paths in `lib/services/*`:
- new invoice / receipt / allocation → `analytics:money`, `analytics:hero`
- lease state change → `analytics:portfolio`, `analytics:hero`
- maintenance write → `analytics:operations`
- trust ledger write → `analytics:trust`, `analytics:hero`

Page-level `Cache-Control: private, no-store` (per-org). Caching is internal to Next, not edge.

### Errors & empty states
- Filter parsing via `lib/zod/analytics.ts`. Bad params → defaults, no 400.
- Service functions throw `ApiError` only on real failures. Empty data is a normal return — every service has a well-defined empty shape so tiles never crash on no-data orgs.
- At page level each service call is wrapped in `safeAwait` → `{ ok: true, data } | { ok: false, error }`; one tile failing does not break the page, it renders an inline error chip with retry.
- Empty-org state: a first-time-user card replaces the page when `getHeroKpis` is all zeros and `properties = 0`.

## Component layer

### Primitives — `components/analytics/`
| Primitive | Purpose | Backed by |
|---|---|---|
| `KpiTile` | hero card: label, big value, delta chip, optional sparkline | Recharts `<AreaChart>` (mini) |
| `ComboChart` | line + bars on shared X | Recharts `<ComposedChart>` |
| `AreaSpark` | tiny gradient area for KPIs | Recharts |
| `Donut` | occupancy / TPN / priority | Recharts `<PieChart>` |
| `StackedBars` | income mix, expiry buckets | Recharts `<BarChart stackId>` |
| `AgingBar` | horizontal stacked single-bar | custom (CSS grid + tooltip) |
| `Funnel` | applications & maintenance funnels | Recharts `<FunnelChart>` |
| `Histogram` | vacancy days, affordability | Recharts |
| `RadialGauge` | renewal rate, collection rate | Recharts `<RadialBarChart>` |
| `RankingTable` | property health ranking, top-overdue | Tanstack Table (verify in stack; otherwise simple table) |
| `MapBoard` | map hero band + side panel | react-leaflet (already installed) |

Color tokens via CSS vars from existing palette (`#001030` ink, `#d4af37` gold, themed success/warn/danger from current dark-mode work).

### Composed tiles — `components/analytics/tiles/`
One file per visualization. Each tile takes its data slice as a prop, renders empty-state when data is empty, exposes a `tileId` for drill-in, and wraps in `<TileFrame>` (header, action menu: Export CSV, Open drill-in; click-to-drill).

Files: `hero-tiles.tsx`, `tile-invoiced-vs-collected.tsx`, `tile-arrears-aging.tsx`, `tile-occupancy.tsx`, `tile-lease-expiry.tsx`, `tile-maintenance-spend.tsx`, `tile-urgent-maintenance.tsx`, `tile-utility-recovery.tsx`, `tile-top-overdue.tsx`, `tile-property-ranking.tsx`, `tile-map.tsx`.

### Layout
- `dashboard-shell.tsx` — sticky tab bar + filter bar + active-filter chip row
- `hero-band.tsx` — 7-tile responsive grid (3 rows mobile, 1 weighted row desktop)
- `tile-grid.tsx` — responsive grid wrapper (`cols={4|3|2|1}`)

### Map hero band
- 480px tall, full width.
- Pin colour by `score = 0.4*collectionRate + 0.3*occupancy + 0.2*(1 - urgentMaintRatio) + 0.1*(1 - leaseExpiryRisk)`. Bands: green > 80, gold 60–80, orange 40–60, red < 40.
- Click pin → `?drill=property:<id>`; side panel renders KPIs + "Open property" link.
- Top-right toggle: `Map · Table` flips to `tile-property-ranking.tsx` rendering the same dataset.
- Legend bottom-left.

### Drill-in drawer
`@drill/[tileId]` parallel slot in `app/(staff)/dashboard/layout.tsx`. When `?drill=...`, renders `<DrillSheet tileId>`. Each tile registers its drawer renderer in `components/analytics/drill/registry.ts`. Drawer features:
- filtered rows behind that visual (e.g., actual expiring leases for the expiry-buckets tile)
- Export CSV button (server action streaming CSV)
- "Open in <section> tab" deep-link preserving filters
- closes via Esc or backdrop → clears `?drill`

### Loading & error
- `Suspense` boundaries per major band (hero, combo chart, map, grid). Skeleton matches final layout (no layout shift).
- Single-tile failure: inline error chip with retry, page stays up.

### Accessibility
- Every chart has a visually-hidden `<table>` fallback + a "View as table" toggle.
- Colour signals duplicated with arrow icons.
- Keyboard: Tab cycles tiles, Enter opens drill-in, Esc closes.

## Testing

- Unit tests per service module against the seeded Acme org from `prisma/seed.ts` (~45 properties, ~245 units). Snapshot the JSON shape returned for a deterministic ctx.
- Integration test: hit `/dashboard?range=12m&compare=prior` against seed data, assert all 16 tiles render without thrown errors.
- A11y smoke test: axe on the Overview route in seed mode.

## Out of scope (v1)

- True utility recovery rate (requires a `MunicipalBill` model — separate spec).
- Landlord and agent dashboards (will compose from this layer in a later spec; tile primitives must be role-agnostic).
- Real-time push updates (cache TTLs are sufficient).
- Historical drill back further than `OrgMonthlySnapshot` retention.
- Custom-saved dashboards / per-user layouts.

## Phasing

1. **Phase 1 — Foundation.** Types, `AnalyticsCtx`, filter URL contract, `DashboardShell`, `HeroBand`, the 7 hero KPI service + tiles, `tile-invoiced-vs-collected`, sibling route plumbing for the 7 tabs (most still empty). Ships the hero band + main combo chart. Already a visible upgrade.
2. **Phase 2 — Overview body.** Remaining 8 Overview tiles (aging, occupancy donut, expiry buckets, maint spend, urgent maint, utility recovery, top overdue, property ranking) + drill-in framework + 4 example drill-ins.
3. **Phase 3 — Map hero band.** `tile-map` + composite health scoring + map↔table toggle + property side-panel drill-in.
4. **Phase 4 — Deep-dive tabs.** Money, Properties, Operations, Tenants, Utilities, Trust pages — each composes existing tiles + 2–3 tab-only ones.
5. **Phase 5 — Polish.** Cache `updateTag` plumbing in mutation paths, CSV exports, empty-state illustrations, accessibility pass, perf tune.

Each phase is independently shippable.

## Open assumptions to verify in implementation

- Tanstack Table is in the stack (CODEBASE.md doesn't list it explicitly). If not present, `RankingTable` falls back to a simple sortable `<table>` — no install required.
- `OrgMonthlySnapshot` retention covers at least 24 months (needed for `compare=yoy` on 12-month range). If less, `compare=yoy` is hidden.
- `audienceQuery` JSON on `AreaNotice` is not consumed by analytics in v1 — outage impact stays under utilities deep-dive only if `LoadSheddingOutage→Property` has a clean join.
