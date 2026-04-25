# Dashboard Analytics — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the hero-band gap and add filter/tab plumbing on `/dashboard` so the staff Overview shows the curated 7 KPIs (with sparklines), the Invoiced-vs-Collected combo chart with prior-period overlay, a sticky tab bar across all sibling routes, and stubs for the three missing tabs (Tenants, Utilities, Trust).

**Architecture:** Build on the existing analytics foundation (KPI registry in `lib/analytics/kpis.ts`, `KpiTile`, Recharts primitives in `components/analytics/charts/`, and role-scoped services in `lib/services/staff-analytics.ts`). Extend — do not replace. Keep the existing `/dashboard/{finance,portfolio,operations,maintenance}` routes; add three sibling stubs; wrap all 8 with a shared `DashboardShell` layout.

**Tech Stack:** Next.js 16.2 (App Router, Server Components), React 19, TypeScript strict, Prisma 7 + Neon, Tailwind 4 + shadcn, Recharts (already installed), `node:test` with tsx for unit tests.

**Existing context to know cold:**
- `KpiTile` already accepts `{ kpiId, value, prior, href, role, className }` and renders the prior-period delta chip. Tests confirm `prior` is optional.
- `getStaffCommandCenter(ctx, { periodStart? })` already returns `{ kpis, priorKpis, collectionsTrend, ... }`. We extend its return type and call sites.
- Existing `AreaChart` two-series shape uses `ChartPoint = { x, y, y2? }` from `components/analytics/charts/area-chart.tsx`. The new `ComboChart` uses a different shape (explicit `bars`, `line`, `priorLine`) to avoid overloading.
- Tests use `node:test` and stub `@/lib/db` by overwriting prisma methods. See `tests/services/applications.test.ts` for the canonical pattern.
- Run a single test file with `node --import tsx --test tests/path/to/file.test.ts`. Run all with `npm test`.
- Lint with `npm run lint`. Type-check with `npx tsc --noEmit`.

---

## File Map

**Create:**
- `lib/analytics/ctx.ts` — `AnalyticsCtx` type + `resolveAnalyticsCtx(searchParams)`
- `lib/zod/analytics.ts` — Zod schema for URL search params
- `components/analytics/sparkline.tsx` — pure SVG sparkline
- `components/analytics/charts/combo-chart.tsx` — Recharts `ComposedChart` line+bars + prior overlay
- `components/analytics/dashboard-shell.tsx` — sticky tab bar + filter bar wrapper
- `app/(staff)/dashboard/layout.tsx` — wraps all 8 dashboard routes with `DashboardShell`
- `app/(staff)/dashboard/tenants/page.tsx` — stub
- `app/(staff)/dashboard/utilities/page.tsx` — stub
- `app/(staff)/dashboard/trust/page.tsx` — stub
- `tests/lib/analytics-kpis.test.ts` — KPI registry coverage for new ids
- `tests/lib/analytics-ctx.test.ts` — `resolveAnalyticsCtx` defaults + parsing
- `tests/services/staff-analytics-hero.test.ts` — new KPI fields + sparkline series shape
- `tests/components/sparkline.test.tsx` — SVG path generation

**Modify:**
- `lib/analytics/kpis.ts` — add 4 KPI ids
- `lib/services/staff-analytics.ts` — populate new KPIs in `snapshotKpis`, add `getUrgentMaintenanceCount`, add `computeNetRentalIncome`, extend return type with `kpiSparks`, accept extended filters
- `components/analytics/kpi-tile.tsx` — add optional `series?: number[]` prop, render `<Sparkline>` when present
- `app/(staff)/dashboard/page.tsx` — re-curate hero band to 7 tiles with sparklines + replace `AreaChart` for collectionsTrend with `ComboChart`
- `CODEBASE.md` — update analytics manifest entries

---

## Task 1: Add 4 KPI ids to the registry

**Files:**
- Modify: `lib/analytics/kpis.ts`
- Test: `tests/lib/analytics-kpis.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/lib/analytics-kpis.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KPIS, getKpi } from '@/lib/analytics/kpis';

describe('KPI registry — Phase 1 additions', () => {
  it('exposes NET_RENTAL_INCOME as CENTS with prior-period comparison', () => {
    const kpi = getKpi('NET_RENTAL_INCOME');
    assert.equal(kpi.format, 'CENTS');
    assert.equal(kpi.comparisonMode, 'PRIOR_PERIOD');
    assert.equal(kpi.label, 'Net rental income');
  });

  it('exposes RENT_BILLED and RENT_COLLECTED as CENTS', () => {
    assert.equal(getKpi('RENT_BILLED').format, 'CENTS');
    assert.equal(getKpi('RENT_COLLECTED').format, 'CENTS');
  });

  it('exposes URGENT_MAINTENANCE as COUNT', () => {
    assert.equal(getKpi('URGENT_MAINTENANCE').format, 'COUNT');
  });

  it('drillTarget for NET_RENTAL_INCOME falls through to /dashboard/finance for ADMIN', () => {
    const kpi = getKpi('NET_RENTAL_INCOME');
    assert.equal(kpi.drillTarget({ role: 'ADMIN' }), '/dashboard/finance');
  });

  it('keeps every existing KpiId reachable through KPIS', () => {
    for (const id of [
      'OCCUPANCY_PCT', 'ARREARS_CENTS', 'COLLECTION_RATE', 'TRUST_BALANCE',
      'UNALLOCATED_CENTS', 'OPEN_MAINTENANCE', 'EXPIRING_LEASES_30',
      'BLOCKED_APPROVALS', 'GROSS_RENT', 'DISBURSED_CENTS', 'MAINTENANCE_SPEND',
      'VACANCY_DRAG', 'AGENT_OPEN_TICKETS', 'AGENT_UPCOMING_INSPECTIONS',
    ] as const) {
      assert.ok(KPIS[id], `missing existing KPI ${id}`);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
node --import tsx --test tests/lib/analytics-kpis.test.ts
```

Expected: `not ok` with errors that `getKpi('NET_RENTAL_INCOME')` returns undefined or that the new ids are missing from the `KpiId` union.

- [ ] **Step 3: Extend the KPI registry**

In `lib/analytics/kpis.ts`, add the new ids to the `KpiId` union (alphabetically near existing finance KPIs):

```ts
export type KpiId =
  | 'OCCUPANCY_PCT'
  | 'ARREARS_CENTS'
  | 'COLLECTION_RATE'
  | 'TRUST_BALANCE'
  | 'UNALLOCATED_CENTS'
  | 'OPEN_MAINTENANCE'
  | 'URGENT_MAINTENANCE'
  | 'EXPIRING_LEASES_30'
  | 'BLOCKED_APPROVALS'
  | 'GROSS_RENT'
  | 'NET_RENTAL_INCOME'
  | 'RENT_BILLED'
  | 'RENT_COLLECTED'
  | 'DISBURSED_CENTS'
  | 'MAINTENANCE_SPEND'
  | 'VACANCY_DRAG'
  | 'AGENT_OPEN_TICKETS'
  | 'AGENT_UPCOMING_INSPECTIONS';
```

Then add four definitions inside the `KPIS` record (place near existing finance KPIs):

```ts
  NET_RENTAL_INCOME: {
    id: 'NET_RENTAL_INCOME',
    label: 'Net rental income',
    eyebrow: 'Income',
    sources: [
      'OrgMonthlySnapshot.collectedCents',
      'LandlordMonthlySnapshot.maintenanceSpendCents',
    ],
    formula: 'collectedCents − sum(landlord.maintenanceSpendCents)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/reports', MANAGING_AGENT: '/agent/maintenance', TENANT: '/tenant/payments' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  RENT_BILLED: {
    id: 'RENT_BILLED',
    label: 'Rent billed',
    eyebrow: 'Income',
    sources: ['OrgMonthlySnapshot.billedCents'],
    formula: 'sum(invoice.totalCents)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/invoices', TENANT: '/tenant/invoices' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  RENT_COLLECTED: {
    id: 'RENT_COLLECTED',
    label: 'Rent collected',
    eyebrow: 'Income',
    sources: ['OrgMonthlySnapshot.collectedCents'],
    formula: 'sum(allocated receipts)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { LANDLORD: '/landlord/reports', TENANT: '/tenant/payments' },
        '/dashboard/finance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'CENTS',
  },
  URGENT_MAINTENANCE: {
    id: 'URGENT_MAINTENANCE',
    label: 'Urgent maintenance',
    eyebrow: 'Operations',
    sources: ['MaintenanceRequest.priority', 'MaintenanceRequest.status'],
    formula: 'count(priority in HIGH/URGENT and status in OPEN/IN_PROGRESS)',
    drillTarget: ({ role }) =>
      byRole(
        role,
        { TENANT: '/tenant/repairs' },
        '/maintenance',
      ),
    comparisonMode: 'PRIOR_PERIOD',
    format: 'COUNT',
  },
```

Note: `getKpi` is the existing exported lookup helper. If it doesn't exist yet (current file only exports `KPIS` + `KpiId` + `KpiDefinition`), add it as a one-liner export at the bottom:

```ts
export function getKpi(id: KpiId): KpiDefinition {
  return KPIS[id];
}
```

(Verify by reading `lib/analytics/kpis.ts:1-50` — it's already imported by `KpiTile`, so `getKpi` exists.)

- [ ] **Step 4: Run the test and verify it passes**

```
node --import tsx --test tests/lib/analytics-kpis.test.ts
```

Expected: `ok` for all 5 cases.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics/kpis.ts tests/lib/analytics-kpis.test.ts
git commit -m "Analytics: add NET_RENTAL_INCOME, RENT_BILLED, RENT_COLLECTED, URGENT_MAINTENANCE KPI ids"
```

---

## Task 2: Surface new KPI values in `staff-analytics.ts`

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: `tests/services/staff-analytics-hero.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/services/staff-analytics-hero.test.ts`:

```ts
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let getStaffCommandCenter: any;

let originalOrgSnapshotFindFirst: any;
let originalOrgSnapshotFindMany: any;
let originalLandlordSnapshotAggregate: any;
let originalMaintenanceCount: any;
let originalPropertyFindMany: any;
let originalLeaseFindMany: any;
let originalInvoiceFindMany: any;
let originalApprovalFindMany: any;
let originalMaintenanceFindMany: any;
let originalOrgFindUnique: any;

const ORG_ID = 'org_test';
const ROUTE_CTX = { orgId: ORG_ID, userId: 'u1', role: 'ADMIN' as const };

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalOrgSnapshotFindFirst = db.orgMonthlySnapshot.findFirst;
  originalOrgSnapshotFindMany = db.orgMonthlySnapshot.findMany;
  originalLandlordSnapshotAggregate = db.landlordMonthlySnapshot.aggregate;
  originalMaintenanceCount = db.maintenanceRequest.count;
  originalMaintenanceFindMany = db.maintenanceRequest.findMany;
  originalPropertyFindMany = db.property.findMany;
  originalLeaseFindMany = db.lease.findMany;
  originalInvoiceFindMany = db.invoice.findMany;
  originalApprovalFindMany = db.approval.findMany;
  originalOrgFindUnique = db.org.findUnique;

  ({ getStaffCommandCenter } = await import('@/lib/services/staff-analytics'));
});

after(() => {
  db.orgMonthlySnapshot.findFirst = originalOrgSnapshotFindFirst;
  db.orgMonthlySnapshot.findMany = originalOrgSnapshotFindMany;
  db.landlordMonthlySnapshot.aggregate = originalLandlordSnapshotAggregate;
  db.maintenanceRequest.count = originalMaintenanceCount;
  db.maintenanceRequest.findMany = originalMaintenanceFindMany;
  db.property.findMany = originalPropertyFindMany;
  db.lease.findMany = originalLeaseFindMany;
  db.invoice.findMany = originalInvoiceFindMany;
  db.approval.findMany = originalApprovalFindMany;
  db.org.findUnique = originalOrgFindUnique;
});

beforeEach(() => {
  db.orgMonthlySnapshot.findFirst = async (args: any) => {
    const ps = (args.where.periodStart as Date).toISOString();
    const isCurrent = ps.startsWith(new Date().toISOString().slice(0, 7));
    return {
      orgId: ORG_ID,
      periodStart: args.where.periodStart,
      occupiedUnits: 18,
      totalUnits: 20,
      arrearsCents: isCurrent ? 8_300_00 : 7_100_00,
      billedCents: isCurrent ? 1_240_000_00 : 1_148_000_00,
      collectedCents: isCurrent ? 1_152_000_00 : 1_063_000_00,
      trustBalanceCents: 425_000_00,
      unallocatedCents: 12_000_00,
      openMaintenance: 17,
      expiringLeases30: 3,
      blockedApprovals: 1,
    };
  };
  db.orgMonthlySnapshot.findMany = async () => [];
  db.landlordMonthlySnapshot.aggregate = async () => ({ _sum: { maintenanceSpendCents: 92_000_00 } });
  db.maintenanceRequest.count = async () => 4;
  db.maintenanceRequest.findMany = async () => [];
  db.property.findMany = async () => [];
  db.lease.findMany = async () => [];
  db.invoice.findMany = async () => [];
  db.approval.findMany = async () => [];
  db.org.findUnique = async () => ({ expiringWindowDays: 60 });
});

describe('getStaffCommandCenter — Phase 1 hero KPIs', () => {
  it('returns RENT_BILLED equal to OrgMonthlySnapshot.billedCents', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.kpis.RENT_BILLED, 1_240_000_00);
    assert.equal(result.priorKpis.RENT_BILLED, 1_148_000_00);
  });

  it('returns RENT_COLLECTED equal to OrgMonthlySnapshot.collectedCents', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.kpis.RENT_COLLECTED, 1_152_000_00);
  });

  it('returns NET_RENTAL_INCOME = collectedCents − landlord maintenanceSpendCents', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.kpis.NET_RENTAL_INCOME, 1_152_000_00 - 92_000_00);
  });

  it('returns URGENT_MAINTENANCE from a live maintenanceRequest count', async () => {
    let observedWhere: any = null;
    db.maintenanceRequest.count = async (args: any) => {
      observedWhere = args.where;
      return 4;
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.kpis.URGENT_MAINTENANCE, 4);
    assert.deepEqual(observedWhere.priority, { in: ['HIGH', 'URGENT'] });
    assert.deepEqual(observedWhere.status, { in: ['OPEN', 'IN_PROGRESS'] });
    assert.equal(observedWhere.orgId, ORG_ID);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
node --import tsx --test tests/services/staff-analytics-hero.test.ts
```

Expected: assertion failures — `kpis.RENT_BILLED` is undefined, `URGENT_MAINTENANCE` is `0`, `NET_RENTAL_INCOME` doesn't exist.

- [ ] **Step 3: Extend `snapshotKpis` and add helpers**

In `lib/services/staff-analytics.ts`:

3a. Update the `snapshotKpis` function (around line 238) to populate the new KPIs from the snapshot:

```ts
function snapshotKpis(snapshot?: {
  occupiedUnits: number;
  totalUnits: number;
  arrearsCents: number;
  billedCents: number;
  collectedCents: number;
  trustBalanceCents: number;
  unallocatedCents: number;
  openMaintenance: number;
  expiringLeases30: number;
  blockedApprovals: number;
}, extra?: { netRentalIncome?: number; urgentMaintenance?: number }) {
  return {
    OCCUPANCY_PCT: percent(snapshot?.occupiedUnits ?? 0, snapshot?.totalUnits ?? 0),
    ARREARS_CENTS: snapshot?.arrearsCents ?? 0,
    COLLECTION_RATE: percent(snapshot?.collectedCents ?? 0, snapshot?.billedCents ?? 0),
    TRUST_BALANCE: snapshot?.trustBalanceCents ?? 0,
    UNALLOCATED_CENTS: snapshot?.unallocatedCents ?? 0,
    OPEN_MAINTENANCE: snapshot?.openMaintenance ?? 0,
    URGENT_MAINTENANCE: extra?.urgentMaintenance ?? 0,
    EXPIRING_LEASES_30: snapshot?.expiringLeases30 ?? 0,
    BLOCKED_APPROVALS: snapshot?.blockedApprovals ?? 0,
    GROSS_RENT: snapshot?.billedCents ?? 0,
    NET_RENTAL_INCOME: extra?.netRentalIncome ?? 0,
    RENT_BILLED: snapshot?.billedCents ?? 0,
    RENT_COLLECTED: snapshot?.collectedCents ?? 0,
    DISBURSED_CENTS: 0,
    MAINTENANCE_SPEND: 0,
    VACANCY_DRAG: 0,
    AGENT_OPEN_TICKETS: 0,
    AGENT_UPCOMING_INSPECTIONS: 0,
  } satisfies KpiMap;
}
```

3b. Add two helpers above `getStaffCommandCenter`:

```ts
async function getUrgentMaintenanceCount(ctx: RouteCtx): Promise<number> {
  return db.maintenanceRequest.count({
    where: {
      orgId: ctx.orgId,
      priority: { in: ['HIGH', 'URGENT'] },
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    },
  });
}

async function computeNetRentalIncome(
  ctx: RouteCtx,
  periodStart: Date,
  collectedCents: number,
): Promise<number> {
  const agg = await db.landlordMonthlySnapshot.aggregate({
    where: { orgId: ctx.orgId, periodStart },
    _sum: { maintenanceSpendCents: true },
  });
  const maint = agg._sum.maintenanceSpendCents ?? 0;
  return collectedCents - maint;
}
```

3c. Inside `getStaffCommandCenter`, after the existing `Promise.all` block resolves and before the `return`, compute the extras and pass them into both `snapshotKpis` calls. Locate the existing `return { periodStart, kpis: snapshotKpis(currentSnapshot ?? undefined), priorKpis: snapshotKpis(priorSnapshot ?? undefined), ... }` and replace with:

```ts
  const [urgentCount, currentNet, priorNet] = await Promise.all([
    getUrgentMaintenanceCount(ctx),
    computeNetRentalIncome(ctx, periodStart, currentSnapshot?.collectedCents ?? 0),
    computeNetRentalIncome(ctx, priorPeriodStart, priorSnapshot?.collectedCents ?? 0),
  ]);

  return {
    periodStart,
    kpis: snapshotKpis(currentSnapshot ?? undefined, {
      netRentalIncome: currentNet,
      urgentMaintenance: urgentCount,
    }),
    priorKpis: snapshotKpis(priorSnapshot ?? undefined, {
      netRentalIncome: priorNet,
      urgentMaintenance: 0, // prior-period urgent count is not tracked yet; show as 0 → no delta
    }),
    expiringLeases,
    topArrears,
    openMaintenance,
    blockedApprovals,
    portfolioPins: properties
      .map((row, index) => buildPropertyPin(row, index))
      .filter((pin): pin is PortfolioPin => pin !== null),
    collectionsTrend,
    maintenanceByStatus,
  };
```

- [ ] **Step 4: Run the test and verify it passes**

```
node --import tsx --test tests/services/staff-analytics-hero.test.ts
```

Expected: all 4 cases pass.

- [ ] **Step 5: Commit**

```bash
git add lib/services/staff-analytics.ts tests/services/staff-analytics-hero.test.ts
git commit -m "staff-analytics: surface RENT_BILLED, RENT_COLLECTED, NET_RENTAL_INCOME, URGENT_MAINTENANCE on hero KPIs"
```

---

## Task 3: Sparkline component

**Files:**
- Create: `components/analytics/sparkline.tsx`
- Test: `tests/components/sparkline.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/components/sparkline.test.tsx`:

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { Sparkline, sparklinePathD } from '@/components/analytics/sparkline';

describe('sparklinePathD', () => {
  it('returns empty string for empty series', () => {
    assert.equal(sparklinePathD([], 100, 30), '');
  });

  it('renders flat line at vertical centre when all values equal', () => {
    const d = sparklinePathD([5, 5, 5, 5], 100, 30);
    // 4 points → 4 commands; y values should all equal 15 (centre of 30px height)
    assert.match(d, /M 0 15 L 33\.33 15 L 66\.67 15 L 100 15/);
  });

  it('rises from bottom-left to top-right for ascending series', () => {
    const d = sparklinePathD([0, 1, 2, 3], 100, 30);
    // Last command should land on top edge (y near 0); first on bottom (y near 30)
    assert.match(d, /^M 0 30/);
    assert.match(d, /L 100 0$/);
  });
});

describe('<Sparkline />', () => {
  it('renders an svg with class and an inline gradient when series is non-empty', () => {
    const html = renderToString(<Sparkline series={[1, 2, 3, 4]} />);
    assert.match(html, /<svg[^>]*class=/);
    assert.match(html, /<linearGradient/);
    assert.match(html, /<path[^>]*d="/);
  });

  it('renders nothing visible when series is empty', () => {
    const html = renderToString(<Sparkline series={[]} />);
    assert.match(html, /<svg/);
    assert.doesNotMatch(html, /<path/);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
node --import tsx --test tests/components/sparkline.test.tsx
```

Expected: cannot resolve `@/components/analytics/sparkline`.

- [ ] **Step 3: Implement the component**

Create `components/analytics/sparkline.tsx`:

```tsx
import { cn } from '@/lib/utils';

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 28;

export function sparklinePathD(series: number[], width: number, height: number): string {
  if (series.length === 0) return '';
  if (series.length === 1) {
    const y = height / 2;
    return `M 0 ${y.toFixed(2)} L ${width.toFixed(2)} ${y.toFixed(2)}`;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  const denomX = series.length - 1;

  const points = series.map((value, index) => {
    const x = (index / denomX) * width;
    const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });

  const commands = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  return commands.join(' ');
}

type SparklineProps = {
  series: number[];
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({
  series,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: SparklineProps) {
  const d = sparklinePathD(series, width, height);
  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;
  const empty = series.length === 0;

  return (
    <svg
      className={cn('block', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden="true"
    >
      {!empty && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${d} L ${width} ${height} L 0 ${height} Z`}
            fill={`url(#${gradientId})`}
          />
          <path
            d={d}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Run the test and verify it passes**

```
node --import tsx --test tests/components/sparkline.test.tsx
```

Expected: all cases pass. If the random gradient id varies, the test does not assert its value; only that `<linearGradient` appears.

- [ ] **Step 5: Commit**

```bash
git add components/analytics/sparkline.tsx tests/components/sparkline.test.tsx
git commit -m "components: add Sparkline (pure SVG mini area chart for KPI tiles)"
```

---

## Task 4: Add `series` prop to `KpiTile`

**Files:**
- Modify: `components/analytics/kpi-tile.tsx`
- Test: extend `tests/components/sparkline.test.tsx` with KpiTile assertion (or add `tests/components/kpi-tile.test.tsx`)

- [ ] **Step 1: Write the failing test**

Create `tests/components/kpi-tile.test.tsx`:

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { KpiTile } from '@/components/analytics/kpi-tile';

describe('<KpiTile />', () => {
  it('renders without sparkline when series is omitted', () => {
    const html = renderToString(
      <KpiTile kpiId="OCCUPANCY_PCT" value={92} />,
    );
    assert.match(html, /Occupancy/);
    assert.doesNotMatch(html, /<svg/);
  });

  it('renders an inline svg sparkline when series is provided', () => {
    const html = renderToString(
      <KpiTile kpiId="OCCUPANCY_PCT" value={92} series={[88, 89, 90, 91, 92]} />,
    );
    assert.match(html, /<svg/);
    assert.match(html, /<path/);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
node --import tsx --test tests/components/kpi-tile.test.tsx
```

Expected: TypeScript error or runtime failure — `series` is not a recognised prop.

- [ ] **Step 3: Add the prop and render the sparkline**

In `components/analytics/kpi-tile.tsx`, update the import block and the props type, then insert the sparkline above the "View detail" line:

```tsx
import { Sparkline } from '@/components/analytics/sparkline';

type KpiTileProps = {
  kpiId: KpiId;
  value: number;
  prior?: number | null;
  series?: number[];
  href?: string;
  role?: Role;
  className?: string;
};

export function KpiTile({
  kpiId,
  value,
  prior,
  series,
  href,
  role = 'ADMIN',
  className,
}: KpiTileProps) {
  const kpi = getKpi(kpiId);
  const target = href ?? resolveDrillTarget(kpiId, role);
  const delta = formatDelta(value, prior);

  return (
    <Link
      href={target}
      className={cn(
        'group block border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]/60 hover:shadow-card',
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
        {kpi.eyebrow}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">{kpi.label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-serif text-[40px] leading-none tracking-[-0.03em] text-foreground">
          {formatKpi(value, kpi.format)}
        </p>
        {delta ? (
          <span className="border border-border bg-[color:var(--muted)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {delta}
          </span>
        ) : null}
      </div>
      {series && series.length > 0 ? (
        <div className="mt-4">
          <Sparkline series={series} width={140} height={28} />
        </div>
      ) : null}
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        View detail
      </p>
    </Link>
  );
}
```

- [ ] **Step 4: Run tests and type-check**

```
node --import tsx --test tests/components/kpi-tile.test.tsx
npx tsc --noEmit
```

Expected: tests pass; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add components/analytics/kpi-tile.tsx tests/components/kpi-tile.test.tsx
git commit -m "KpiTile: add optional series prop to render an inline sparkline"
```

---

## Task 5: Per-KPI sparkline series in `getStaffCommandCenter`

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: extend `tests/services/staff-analytics-hero.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/services/staff-analytics-hero.test.ts`:

```ts
describe('getStaffCommandCenter — kpiSparks', () => {
  beforeEach(() => {
    db.orgMonthlySnapshot.findMany = async (args: any) => {
      // Return 12 months of synthetic snapshots ending at current period
      const periodTo = args.where.periodStart.lte as Date;
      const months: Date[] = [];
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(Date.UTC(periodTo.getUTCFullYear(), periodTo.getUTCMonth() - i, 1));
        months.push(d);
      }
      return months.map((periodStart, idx) => ({
        orgId: ORG_ID,
        periodStart,
        occupiedUnits: 17 + (idx % 3),
        totalUnits: 20,
        arrearsCents: 5_000_00 + idx * 100_00,
        billedCents: 1_000_000_00 + idx * 10_000_00,
        collectedCents: 950_000_00 + idx * 9_500_00,
        trustBalanceCents: 400_000_00,
        unallocatedCents: 0,
        openMaintenance: 10,
        expiringLeases30: 2,
        blockedApprovals: 0,
      }));
    };
  });

  it('returns a 12-element series for each headline KPI', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    for (const id of ['OCCUPANCY_PCT', 'ARREARS_CENTS', 'COLLECTION_RATE', 'TRUST_BALANCE', 'RENT_BILLED', 'RENT_COLLECTED'] as const) {
      assert.ok(result.kpiSparks[id], `missing kpiSparks.${id}`);
      assert.equal(result.kpiSparks[id]!.length, 12, `${id} series length`);
    }
  });

  it('OCCUPANCY_PCT series values are bounded 0..100', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    for (const v of result.kpiSparks.OCCUPANCY_PCT!) {
      assert.ok(v >= 0 && v <= 100, `out-of-range pct ${v}`);
    }
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
node --import tsx --test tests/services/staff-analytics-hero.test.ts
```

Expected: `result.kpiSparks` is undefined.

- [ ] **Step 3: Compute and return `kpiSparks`**

In `lib/services/staff-analytics.ts`:

3a. Extend the `StaffCommandCenter` type (around line 70):

```ts
export type StaffCommandCenter = {
  periodStart: Date;
  kpis: KpiMap;
  priorKpis: Partial<KpiMap>;
  kpiSparks: Partial<Record<KpiId, number[]>>;
  expiringLeases: ExpiringLeaseRow[];
  topArrears: ArrearsRow[];
  openMaintenance: MaintenanceRow[];
  blockedApprovals: ApprovalRow[];
  portfolioPins: PortfolioPin[];
  collectionsTrend: ChartPoint[];
  maintenanceByStatus: ChartPoint[];
};
```

3b. Add a helper that turns a 12-month snapshot series into per-KPI sparkline arrays (place near `snapshotKpis`):

```ts
function buildKpiSparks(rows: Array<{
  occupiedUnits: number;
  totalUnits: number;
  arrearsCents: number;
  billedCents: number;
  collectedCents: number;
  trustBalanceCents: number;
}>): Partial<Record<KpiId, number[]>> {
  return {
    OCCUPANCY_PCT: rows.map((r) => percent(r.occupiedUnits, r.totalUnits)),
    ARREARS_CENTS: rows.map((r) => r.arrearsCents),
    COLLECTION_RATE: rows.map((r) => percent(r.collectedCents, r.billedCents)),
    TRUST_BALANCE: rows.map((r) => r.trustBalanceCents),
    RENT_BILLED: rows.map((r) => r.billedCents),
    RENT_COLLECTED: rows.map((r) => r.collectedCents),
    NET_RENTAL_INCOME: rows.map((r) => r.collectedCents), // refined in Phase 2
  };
}
```

3c. Inside `getStaffCommandCenter`, after the `series` await, build `kpiSparks` from the snapshot series and include it in the return object:

```ts
  const kpiSparks = buildKpiSparks(series);
  // ... existing rawTrend / collectionsTrend logic ...
  return {
    periodStart,
    kpis: snapshotKpis(currentSnapshot ?? undefined, { netRentalIncome: currentNet, urgentMaintenance: urgentCount }),
    priorKpis: snapshotKpis(priorSnapshot ?? undefined, { netRentalIncome: priorNet, urgentMaintenance: 0 }),
    kpiSparks,
    expiringLeases,
    topArrears,
    openMaintenance,
    blockedApprovals,
    portfolioPins: properties
      .map((row, index) => buildPropertyPin(row, index))
      .filter((pin): pin is PortfolioPin => pin !== null),
    collectionsTrend,
    maintenanceByStatus,
  };
```

- [ ] **Step 4: Run the test and verify it passes**

```
node --import tsx --test tests/services/staff-analytics-hero.test.ts
```

Expected: 6 cases pass (4 hero + 2 sparks).

- [ ] **Step 5: Commit**

```bash
git add lib/services/staff-analytics.ts tests/services/staff-analytics-hero.test.ts
git commit -m "staff-analytics: return per-KPI 12-month sparkline series in getStaffCommandCenter"
```

---

## Task 6: ComboChart primitive

**Files:**
- Create: `components/analytics/charts/combo-chart.tsx`
- Test: `tests/components/combo-chart.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/components/combo-chart.test.tsx`:

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { ComboChart, type ComboChartPoint } from '@/components/analytics/charts/combo-chart';

const data: ComboChartPoint[] = [
  { x: 'Jan', bars: 100_000_00, line: 90_000_00, priorLine: 85_000_00 },
  { x: 'Feb', bars: 110_000_00, line: 102_000_00, priorLine: 88_000_00 },
  { x: 'Mar', bars: 120_000_00, line: 115_000_00 },
];

describe('<ComboChart />', () => {
  it('renders a ResponsiveContainer wrapper', () => {
    const html = renderToString(<ComboChart data={data} yFormat="cents" seriesLabels={{ bars: 'Billed', line: 'Collected' }} />);
    // Recharts uses a div wrapper; SVG renders client-side. Server-side renderToString
    // produces the container at minimum.
    assert.ok(html.includes('recharts-responsive-container') || html.includes('div'));
  });

  it('does not throw with empty data', () => {
    assert.doesNotThrow(() => renderToString(<ComboChart data={[]} yFormat="cents" />));
  });

  it('does not throw when priorLine is omitted entirely', () => {
    const stripped = data.map(({ priorLine: _omit, ...rest }) => rest);
    assert.doesNotThrow(() => renderToString(<ComboChart data={stripped} yFormat="cents" />));
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
node --import tsx --test tests/components/combo-chart.test.tsx
```

Expected: cannot resolve module.

- [ ] **Step 3: Implement the chart**

Create `components/analytics/charts/combo-chart.tsx`:

```tsx
'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartTheme } from '@/lib/analytics/chart-theme';
import { formatZar } from '@/lib/format';

export type ComboChartPoint = {
  x: string;
  bars: number;
  line: number;
  priorLine?: number;
};

type ComboChartProps = {
  data: ComboChartPoint[];
  height?: number;
  yFormat?: 'cents' | 'count';
  seriesLabels?: { bars?: string; line?: string; priorLine?: string };
};

function formatTickCurrency(value: number): string {
  const rand = value / 100;
  const abs = Math.abs(rand);
  if (abs >= 1_000_000) {
    const m = rand / 1_000_000;
    return `R${m >= 10 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) return `R${Math.round(rand / 1_000)}k`;
  return `R${Math.round(rand)}`;
}

function formatTick(value: number, mode: 'cents' | 'count'): string {
  return mode === 'cents' ? formatTickCurrency(value) : String(value);
}

type TooltipPayloadEntry = { dataKey?: string | number; value?: number | string; color?: string };
type TooltipProps = { active?: boolean; label?: string; payload?: TooltipPayloadEntry[] };

function buildTooltip(yFormat: 'cents' | 'count', labels: ComboChartProps['seriesLabels']) {
  const labelFor = (key: unknown) => {
    if (key === 'bars') return labels?.bars ?? 'Bars';
    if (key === 'line') return labels?.line ?? 'Line';
    if (key === 'priorLine') return labels?.priorLine ?? 'Prior';
    return String(key ?? '');
  };
  const fmt = (raw: unknown) => {
    const n = typeof raw === 'number' ? raw : Number(raw ?? 0);
    if (!Number.isFinite(n)) return '—';
    return yFormat === 'cents' ? formatZar(n) : n.toLocaleString();
  };

  function ChartTooltip({ active, label, payload }: TooltipProps) {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: chartTheme.tooltipSurface,
          border: `1px solid ${chartTheme.tooltipBorder}`,
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: 12,
          color: chartTheme.text,
          minWidth: 160,
        }}
      >
        <div style={{ fontFamily: chartTheme.fonts.eyebrow, fontSize: 10, opacity: 0.7, marginBottom: 4 }}>{label}</div>
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: entry.color }}>{labelFor(entry.dataKey)}</span>
            <span>{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return ChartTooltip;
}

export function ComboChart({ data, height = 260, yFormat = 'count', seriesLabels }: ComboChartProps) {
  const showLegend = Boolean(seriesLabels?.bars || seriesLabels?.line || seriesLabels?.priorLine);
  const showPrior = data.some((p) => typeof p.priorLine === 'number');
  const Tip = buildTooltip(yFormat, seriesLabels);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={chartTheme.gridStroke} vertical={false} />
          <XAxis dataKey="x" stroke={chartTheme.axisStroke} fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke={chartTheme.axisStroke}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatTick(Number(v), yFormat)}
          />
          <Tooltip content={<Tip />} cursor={{ fill: chartTheme.surfaceMuted, opacity: 0.4 }} />
          {showLegend ? <Legend wrapperStyle={{ fontSize: 11, paddingBottom: 4 }} /> : null}
          <Bar
            dataKey="bars"
            name={seriesLabels?.bars ?? 'Bars'}
            fill={chartTheme.seriesA}
            radius={[2, 2, 0, 0]}
            maxBarSize={28}
          />
          <Line
            dataKey="line"
            name={seriesLabels?.line ?? 'Line'}
            stroke={chartTheme.seriesB}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          {showPrior ? (
            <Line
              dataKey="priorLine"
              name={seriesLabels?.priorLine ?? 'Prior'}
              stroke={chartTheme.seriesB}
              strokeWidth={1.25}
              strokeDasharray="4 4"
              strokeOpacity={0.45}
              dot={false}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Run the test and verify it passes**

```
node --import tsx --test tests/components/combo-chart.test.tsx
npx tsc --noEmit
```

Expected: tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add components/analytics/charts/combo-chart.tsx tests/components/combo-chart.test.tsx
git commit -m "components: add ComboChart (Recharts ComposedChart line+bars with prior overlay)"
```

---

## Task 7: Compute prior-period collected series + ComboChart payload in service

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: extend `tests/services/staff-analytics-hero.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/services/staff-analytics-hero.test.ts`:

```ts
describe('getStaffCommandCenter — collectionsCombo', () => {
  it('returns a combo-chart payload with x, bars (billed), line (collected), and priorLine when 24mo of snapshots exist', async () => {
    db.orgMonthlySnapshot.findMany = async (args: any) => {
      const lte = args.where.periodStart.lte as Date;
      const gte = args.where.periodStart.gte as Date;
      const months: Date[] = [];
      const cursor = new Date(gte);
      while (cursor <= lte) {
        months.push(new Date(cursor));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return months.map((periodStart, idx) => ({
        orgId: ORG_ID,
        periodStart,
        occupiedUnits: 18, totalUnits: 20,
        arrearsCents: 0,
        billedCents: 1_000_000_00 + idx * 1_000_00,
        collectedCents: 900_000_00 + idx * 1_000_00,
        trustBalanceCents: 0, unallocatedCents: 0,
        openMaintenance: 0, expiringLeases30: 0, blockedApprovals: 0,
      }));
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.ok(Array.isArray(result.collectionsCombo), 'collectionsCombo array');
    assert.ok(result.collectionsCombo.length >= 1);
    const last = result.collectionsCombo.at(-1)!;
    assert.equal(typeof last.x, 'string');
    assert.equal(typeof last.bars, 'number');
    assert.equal(typeof last.line, 'number');
    // priorLine should be present on at least one entry when 24 months are available
    assert.ok(result.collectionsCombo.some((p: any) => typeof p.priorLine === 'number'));
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
node --import tsx --test tests/services/staff-analytics-hero.test.ts
```

Expected: `result.collectionsCombo` is undefined.

- [ ] **Step 3: Compute the combo payload**

In `lib/services/staff-analytics.ts`:

3a. Extend the type:

```ts
import type { ComboChartPoint } from '@/components/analytics/charts/combo-chart';

export type StaffCommandCenter = {
  periodStart: Date;
  kpis: KpiMap;
  priorKpis: Partial<KpiMap>;
  kpiSparks: Partial<Record<KpiId, number[]>>;
  expiringLeases: ExpiringLeaseRow[];
  topArrears: ArrearsRow[];
  openMaintenance: MaintenanceRow[];
  blockedApprovals: ApprovalRow[];
  portfolioPins: PortfolioPin[];
  collectionsTrend: ChartPoint[];
  collectionsCombo: ComboChartPoint[];
  maintenanceByStatus: ChartPoint[];
};
```

3b. Update `getOrgSnapshotSeries` to optionally span 24 months when prior overlay is wanted, OR add a sibling helper. Simplest path: extend the existing call inside `getStaffCommandCenter` to pull 24 months and slice locally.

Replace the existing `series` call with:

```ts
const seriesAll = await getOrgSnapshotSeries(ctx, periodStart, 24);
const seriesMap = new Map(seriesAll.map((row) => [keyForMonth(row.periodStart), row]));
const window = Array.from({ length: 12 }, (_, index) => addMonths(periodStart, index - 11));

const rawTrend = window.map((month) => {
  const row = seriesMap.get(keyForMonth(month));
  return { x: labelForMonth(month), y: row?.billedCents ?? 0, y2: row?.collectedCents ?? 0 };
});
const firstNonZero = rawTrend.findIndex((p) => p.y > 0 || (p.y2 ?? 0) > 0);
const collectionsTrend = firstNonZero > 0 ? rawTrend.slice(firstNonZero) : rawTrend;

const collectionsCombo: ComboChartPoint[] = window.map((month) => {
  const row = seriesMap.get(keyForMonth(month));
  const priorMonth = addMonths(month, -12);
  const priorRow = seriesMap.get(keyForMonth(priorMonth));
  return {
    x: labelForMonth(month),
    bars: row?.billedCents ?? 0,
    line: row?.collectedCents ?? 0,
    ...(priorRow ? { priorLine: priorRow.collectedCents } : {}),
  };
});
```

Also update `buildKpiSparks(series)` call site to pass the trimmed 12-month window:

```ts
const sparkRows = window.map((month) => {
  const row = seriesMap.get(keyForMonth(month));
  return {
    occupiedUnits: row?.occupiedUnits ?? 0,
    totalUnits: row?.totalUnits ?? 0,
    arrearsCents: row?.arrearsCents ?? 0,
    billedCents: row?.billedCents ?? 0,
    collectedCents: row?.collectedCents ?? 0,
    trustBalanceCents: row?.trustBalanceCents ?? 0,
  };
});
const kpiSparks = buildKpiSparks(sparkRows);
```

Add `collectionsCombo` to the return object.

- [ ] **Step 4: Run the test and verify it passes**

```
node --import tsx --test tests/services/staff-analytics-hero.test.ts
```

Expected: all cases pass including the new combo test.

- [ ] **Step 5: Commit**

```bash
git add lib/services/staff-analytics.ts tests/services/staff-analytics-hero.test.ts
git commit -m "staff-analytics: add collectionsCombo payload (12mo billed/collected + 12mo prior overlay)"
```

---

## Task 8: Re-curate Overview hero band + replace AreaChart with ComboChart

**Files:**
- Modify: `app/(staff)/dashboard/page.tsx`

- [ ] **Step 1: Read the current file**

```
Read app/(staff)/dashboard/page.tsx (full file, currently ~111 lines)
```

This is a Server Component; no test infrastructure is needed for the page itself in Phase 1. The service layer is already covered by Task 5/7 tests.

- [ ] **Step 2: Replace the hero KPI grid and the trend card**

Replace `app/(staff)/dashboard/page.tsx` contents with:

```tsx
import Link from 'next/link';

import { ComboChart } from '@/components/analytics/charts/combo-chart';
import { BarChart } from '@/components/analytics/charts/bar-chart';
import { KpiTile } from '@/components/analytics/kpi-tile';
import { MapPanel } from '@/components/analytics/maps/map-panel';
import { RankedList } from '@/components/analytics/ranked-list';
import { StatusStrip } from '@/components/analytics/status-strip';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { buttonVariants } from '@/components/ui/button';
import { formatDate, formatZar } from '@/lib/format';
import { getStaffCommandCenter } from '@/lib/services/staff-analytics';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const data = await getStaffCommandCenter(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Command Center"
        title="Dashboard"
        description="Income, arrears, occupancy, maintenance, and risk — your portfolio in one editorial view."
        actions={
          <Link
            href="/dashboard/portfolio"
            className={cn(buttonVariants({ variant: 'outline' }), 'font-mono text-[10px] uppercase tracking-[0.16em]')}
          >
            Open portfolio
          </Link>
        }
      />

      {/* Hero band — 7 curated KPIs with sparklines */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <KpiTile kpiId="NET_RENTAL_INCOME" value={data.kpis.NET_RENTAL_INCOME} prior={data.priorKpis.NET_RENTAL_INCOME} series={data.kpiSparks.NET_RENTAL_INCOME} />
        <KpiTile kpiId="RENT_BILLED" value={data.kpis.RENT_BILLED} prior={data.priorKpis.RENT_BILLED} series={data.kpiSparks.RENT_BILLED} />
        <KpiTile kpiId="RENT_COLLECTED" value={data.kpis.RENT_COLLECTED} prior={data.priorKpis.RENT_COLLECTED} series={data.kpiSparks.RENT_COLLECTED} />
        <KpiTile kpiId="COLLECTION_RATE" value={data.kpis.COLLECTION_RATE} prior={data.priorKpis.COLLECTION_RATE} series={data.kpiSparks.COLLECTION_RATE} />
        <KpiTile kpiId="OCCUPANCY_PCT" value={data.kpis.OCCUPANCY_PCT} prior={data.priorKpis.OCCUPANCY_PCT} series={data.kpiSparks.OCCUPANCY_PCT} />
        <KpiTile kpiId="ARREARS_CENTS" value={data.kpis.ARREARS_CENTS} prior={data.priorKpis.ARREARS_CENTS} series={data.kpiSparks.ARREARS_CENTS} />
        <KpiTile kpiId="TRUST_BALANCE" value={data.kpis.TRUST_BALANCE} prior={data.priorKpis.TRUST_BALANCE} series={data.kpiSparks.TRUST_BALANCE} />
      </div>

      <StatusStrip
        items={[
          { id: 'urgent', label: 'Urgent maintenance', value: String(data.kpis.URGENT_MAINTENANCE), tone: 'alert' },
          { id: 'blocked', label: 'Blocked approvals', value: String(data.kpis.BLOCKED_APPROVALS), tone: 'alert' },
          { id: 'expiring', label: 'Expiring leases', value: String(data.expiringLeases.length), tone: 'accent' },
          { id: 'current-period', label: 'Current period', value: formatDate(data.periodStart) },
        ]}
      />

      {/* Invoiced vs Collected combo chart with prior-period overlay */}
      <Card className="border border-border p-5">
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Trend</p>
          <h2 className="mt-2 font-serif text-[30px] font-light tracking-[-0.02em] text-foreground">
            Invoiced vs Collected
          </h2>
        </div>
        <ComboChart
          data={data.collectionsCombo}
          yFormat="cents"
          seriesLabels={{ bars: 'Billed', line: 'Collected', priorLine: 'Collected (prior year)' }}
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
        <MapPanel title="Portfolio footprint" eyebrow="Portfolio" pins={data.portfolioPins} />
        <RankedList
          title="Top arrears"
          eyebrow="Finance"
          items={data.topArrears.map((row) => ({
            id: row.id,
            title: row.title,
            subtitle: row.subtitle,
            value: formatZar(row.amountCents),
            href: row.href,
          }))}
          emptyCopy="No overdue invoices are currently pushing into arrears."
        />
        <RankedList
          title="Open maintenance"
          eyebrow="Operations"
          items={data.openMaintenance.map((row) => ({
            id: row.id,
            title: row.title,
            subtitle: `${row.subtitle} · ${row.priority}`,
            value: row.status.replace('_', ' '),
            href: row.href,
          }))}
          emptyCopy="No open tickets are waiting in the queue."
        />
      </div>

      <Card className="border border-border p-5">
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Workload</p>
          <h2 className="mt-2 font-serif text-[30px] font-light tracking-[-0.02em] text-foreground">
            Maintenance by status
          </h2>
        </div>
        <BarChart data={data.maintenanceByStatus} />
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Type-check + visual smoke test**

```
npx tsc --noEmit
npm run lint
npm run dev   # then open http://localhost:3000/dashboard with seed data
```

Expected: no TS / lint errors. The Overview shows 7 KPI tiles with mini sparklines, a `ComboChart` with bars + two lines (current solid, prior dashed), the `StatusStrip` now includes Urgent maintenance, and the rest of the page is unchanged.

- [ ] **Step 4: Confirm seed-data renders**

If `npm run dev` shows empty KPIs, the seed snapshot may be missing the current period — run `npm run prisma:seed` and reload. Document this in the README only if it's actually needed; otherwise skip.

- [ ] **Step 5: Commit**

```bash
git add app/\(staff\)/dashboard/page.tsx
git commit -m "Dashboard Overview: re-curate hero to 7 KPIs with sparklines, swap AreaChart for ComboChart with prior overlay"
```

---

## Task 9: Filter URL contract — `AnalyticsCtx` + Zod parser

**Files:**
- Create: `lib/zod/analytics.ts`
- Create: `lib/analytics/ctx.ts`
- Test: `tests/lib/analytics-ctx.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/analytics-ctx.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveAnalyticsCtx } from '@/lib/analytics/ctx';

const orgCtx = { orgId: 'org_1', userId: 'u1', role: 'ADMIN' as const };

describe('resolveAnalyticsCtx', () => {
  it('returns defaults when no params are provided', () => {
    const ctx = resolveAnalyticsCtx(new URLSearchParams(), orgCtx);
    assert.equal(ctx.orgId, 'org_1');
    assert.equal(ctx.compare, 'prior');
    assert.deepEqual(ctx.scope, {});
    // 12-month default range ends at the current month start
    assert.ok(ctx.range.from instanceof Date);
    assert.ok(ctx.range.to instanceof Date);
    const months = (ctx.range.to.getUTCFullYear() - ctx.range.from.getUTCFullYear()) * 12
      + (ctx.range.to.getUTCMonth() - ctx.range.from.getUTCMonth());
    assert.equal(months, 11, 'default range spans 11 month-deltas (12 buckets)');
  });

  it('parses range=3m correctly', () => {
    const ctx = resolveAnalyticsCtx(new URLSearchParams('range=3m'), orgCtx);
    const months = (ctx.range.to.getUTCFullYear() - ctx.range.from.getUTCFullYear()) * 12
      + (ctx.range.to.getUTCMonth() - ctx.range.from.getUTCMonth());
    assert.equal(months, 2);
  });

  it('parses compare=off / yoy / prior', () => {
    assert.equal(resolveAnalyticsCtx(new URLSearchParams('compare=off'), orgCtx).compare, 'off');
    assert.equal(resolveAnalyticsCtx(new URLSearchParams('compare=yoy'), orgCtx).compare, 'yoy');
    assert.equal(resolveAnalyticsCtx(new URLSearchParams('compare=prior'), orgCtx).compare, 'prior');
  });

  it('parses scope filters into arrays', () => {
    const ctx = resolveAnalyticsCtx(
      new URLSearchParams('properties=p1,p2&landlords=l1&agents='),
      orgCtx,
    );
    assert.deepEqual(ctx.scope.propertyIds, ['p1', 'p2']);
    assert.deepEqual(ctx.scope.landlordIds, ['l1']);
    assert.equal(ctx.scope.agentIds, undefined, 'empty string → undefined');
  });

  it('falls back to defaults on garbage input (does not throw)', () => {
    const ctx = resolveAnalyticsCtx(new URLSearchParams('range=zzz&compare=banana'), orgCtx);
    assert.equal(ctx.compare, 'prior');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```
node --import tsx --test tests/lib/analytics-ctx.test.ts
```

Expected: cannot resolve `@/lib/analytics/ctx`.

- [ ] **Step 3: Implement the Zod schema and resolver**

Create `lib/zod/analytics.ts`:

```ts
import { z } from 'zod';

export const rangePresetSchema = z.enum(['1m', '3m', '12m', 'ytd']);
export const compareModeSchema = z.enum(['prior', 'yoy', 'off']);

export const analyticsSearchParamsSchema = z.object({
  range: z.union([rangePresetSchema, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  compare: compareModeSchema.optional(),
  properties: z.string().optional(),
  landlords: z.string().optional(),
  agents: z.string().optional(),
});

export type AnalyticsSearchParams = z.infer<typeof analyticsSearchParamsSchema>;
```

Create `lib/analytics/ctx.ts`:

```ts
import type { RouteCtx } from '@/lib/auth/with-org';
import { analyticsSearchParamsSchema } from '@/lib/zod/analytics';

export type DateRange = { from: Date; to: Date };
export type CompareMode = 'prior' | 'yoy' | 'off';
export type Scope = {
  propertyIds?: string[];
  landlordIds?: string[];
  agentIds?: string[];
};

export type AnalyticsCtx = RouteCtx & {
  range: DateRange;
  compare: CompareMode;
  scope: Scope;
};

function monthFloorUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function rangeFromPreset(preset: '1m' | '3m' | '12m' | 'ytd', now: Date): DateRange {
  const to = monthFloorUtc(now);
  if (preset === '1m') return { from: to, to };
  if (preset === '3m') return { from: addMonthsUtc(to, -2), to };
  if (preset === '12m') return { from: addMonthsUtc(to, -11), to };
  // ytd → from Jan 1 of current year, to current month
  const ytdFrom = new Date(Date.UTC(to.getUTCFullYear(), 0, 1));
  return { from: ytdFrom, to };
}

function csvList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function resolveAnalyticsCtx(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  base: RouteCtx,
): AnalyticsCtx {
  const raw =
    searchParams instanceof URLSearchParams
      ? Object.fromEntries(searchParams.entries())
      : Object.fromEntries(
          Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        );
  const parsed = analyticsSearchParamsSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};
  const now = new Date();

  let range: DateRange;
  if (data.from && data.to) {
    range = { from: new Date(`${data.from}T00:00:00Z`), to: new Date(`${data.to}T00:00:00Z`) };
  } else if (data.range && ['1m', '3m', '12m', 'ytd'].includes(data.range)) {
    range = rangeFromPreset(data.range as '1m' | '3m' | '12m' | 'ytd', now);
  } else {
    range = rangeFromPreset('12m', now);
  }

  return {
    ...base,
    range,
    compare: data.compare ?? 'prior',
    scope: {
      propertyIds: csvList(data.properties),
      landlordIds: csvList(data.landlords),
      agentIds: csvList(data.agents),
    },
  };
}
```

- [ ] **Step 4: Run the test and verify it passes**

```
node --import tsx --test tests/lib/analytics-ctx.test.ts
npx tsc --noEmit
```

Expected: all 5 cases pass; no type errors.

- [ ] **Step 5: Commit**

```bash
git add lib/zod/analytics.ts lib/analytics/ctx.ts tests/lib/analytics-ctx.test.ts
git commit -m "Analytics: add AnalyticsCtx + resolveAnalyticsCtx (URL filter contract with Zod)"
```

---

## Task 10: `DashboardShell` tab bar + filter bar

**Files:**
- Create: `components/analytics/dashboard-shell.tsx`
- Create: `app/(staff)/dashboard/layout.tsx`

- [ ] **Step 1: Build the shell component**

Create `components/analytics/dashboard-shell.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard',             label: 'Overview',    match: (p: string) => p === '/dashboard' },
  { href: '/dashboard/finance',     label: 'Money',       match: (p: string) => p.startsWith('/dashboard/finance') },
  { href: '/dashboard/portfolio',   label: 'Properties',  match: (p: string) => p.startsWith('/dashboard/portfolio') },
  { href: '/dashboard/operations',  label: 'Operations',  match: (p: string) => p.startsWith('/dashboard/operations') },
  { href: '/dashboard/maintenance', label: 'Maintenance', match: (p: string) => p.startsWith('/dashboard/maintenance') },
  { href: '/dashboard/tenants',     label: 'Tenants',     match: (p: string) => p.startsWith('/dashboard/tenants') },
  { href: '/dashboard/utilities',   label: 'Utilities',   match: (p: string) => p.startsWith('/dashboard/utilities') },
  { href: '/dashboard/trust',       label: 'Trust',       match: (p: string) => p.startsWith('/dashboard/trust') },
] as const;

const RANGES = ['1m', '3m', '12m', 'ytd'] as const;
const COMPARES = ['prior', 'yoy', 'off'] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const currentRange = (params.get('range') ?? '12m') as (typeof RANGES)[number];
  const currentCompare = (params.get('compare') ?? 'prior') as (typeof COMPARES)[number];

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/85 px-4 backdrop-blur md:-mx-6 md:px-6">
        <nav aria-label="Dashboard tabs" className="flex gap-1 overflow-x-auto py-2">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const href = `${tab.href}${params.toString() ? `?${params.toString()}` : ''}`;
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  'whitespace-nowrap border border-transparent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em]',
                  active
                    ? 'border-[color:var(--accent)]/60 bg-[color:var(--muted)] text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-3 pb-3 pt-1 text-[11px]">
          <span className="font-mono uppercase tracking-[0.16em] text-muted-foreground">Range</span>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setParam('range', r)}
                className={cn(
                  'border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]',
                  currentRange === r ? 'bg-[color:var(--muted)] text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="ml-3 font-mono uppercase tracking-[0.16em] text-muted-foreground">Compare</span>
          <div className="flex gap-1">
            {COMPARES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setParam('compare', c)}
                className={cn(
                  'border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]',
                  currentCompare === c ? 'bg-[color:var(--muted)] text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Wrap dashboard routes with the shell**

Create `app/(staff)/dashboard/layout.tsx`:

```tsx
import type { ReactNode } from 'react';

import { DashboardShell } from '@/components/analytics/dashboard-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
```

- [ ] **Step 3: Type-check + lint + dev smoke**

```
npx tsc --noEmit
npm run lint
npm run dev
```

Expected: no errors. Open `/dashboard` — the sticky tab bar appears with 8 tabs; the active tab is highlighted; range/compare buttons toggle URL params and refresh data via Server Component re-render.

- [ ] **Step 4: Confirm filters do not break the service**

Service signatures don't yet read URL params; filters are no-ops for now. That's expected — Task 11 wires them through. Confirm the page does not crash when toggling.

- [ ] **Step 5: Commit**

```bash
git add components/analytics/dashboard-shell.tsx app/\(staff\)/dashboard/layout.tsx
git commit -m "Dashboard: add sticky shell layout with 8-tab nav + range/compare URL filters"
```

---

## Task 11: Thread `AnalyticsCtx` through `getStaffCommandCenter`

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Modify: `app/(staff)/dashboard/page.tsx`
- Test: extend `tests/services/staff-analytics-hero.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/services/staff-analytics-hero.test.ts`:

```ts
describe('getStaffCommandCenter — periodStart from filters', () => {
  it('uses filters.periodStart instead of now() when provided', async () => {
    const observed: Date[] = [];
    db.orgMonthlySnapshot.findFirst = async (args: any) => {
      observed.push(args.where.periodStart);
      return null; // force lazy recompute path; recompute is mocked elsewhere — return null is fine for the test
    };
    db.orgMonthlySnapshot.findMany = async () => [];
    db.landlordMonthlySnapshot.aggregate = async () => ({ _sum: { maintenanceSpendCents: 0 } });
    db.maintenanceRequest.count = async () => 0;
    const fixed = new Date(Date.UTC(2026, 0, 1));
    await getStaffCommandCenter(ROUTE_CTX, { periodStart: fixed });
    assert.ok(observed.some((d) => d.getTime() === fixed.getTime()), 'periodStart honoured');
  });
});
```

- [ ] **Step 2: Run the test**

```
node --import tsx --test tests/services/staff-analytics-hero.test.ts
```

Expected: this passes already because `filters.periodStart` is honoured. If it fails it's because the lazy recompute path on `null` snapshot throws — guard the test by stubbing `recomputeOrgSnapshot` not to throw, or accept that the test already passes (filter wiring already exists). If still failing, fix the test's mock to return a snapshot row matching the requested periodStart.

(This task documents existing behaviour and locks it in; if the existing path already works, declare the test redundant and skip — note in the commit message.)

- [ ] **Step 3: Pass `range.to` from `AnalyticsCtx` into the page-level service call**

In `app/(staff)/dashboard/page.tsx`, accept `searchParams` and resolve the analytics ctx:

```tsx
import { resolveAnalyticsCtx } from '@/lib/analytics/ctx';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const baseCtx = userToRouteCtx(session!.user);
  const sp = await searchParams;
  const ctx = resolveAnalyticsCtx(new URLSearchParams(Object.entries(sp).flatMap(([k, v]) =>
    v === undefined ? [] : Array.isArray(v) ? v.map((vv) => [k, vv] as [string, string]) : [[k, v] as [string, string]],
  )), baseCtx);

  const data = await getStaffCommandCenter(baseCtx, { periodStart: ctx.range.to });
  // … rest of page unchanged …
}
```

(Phase 1 stops here. The `compare` and `scope` parts of `ctx` are not yet consumed by the service in Phase 1; Phase 2 wires them. Filter-bar buttons still update the URL and the page re-renders, so the user sees that the controls are live even if compare=off doesn't yet hide the prior overlay. Document this gap in `CODEBASE.md` and the spec.)

- [ ] **Step 4: Type-check + dev smoke**

```
npx tsc --noEmit
npm run lint
npm run dev
```

Expected: clean. `/dashboard?range=3m` reloads to a 3-month-anchored view (still shows 12 months in the trend until Phase 2 narrows it; range only affects `periodStart` in Phase 1 — periodStart is end-of-window, so a 3m preset moves periodStart to 2 months ago. Verify this is acceptable visually; if it's confusing, remove the range button from the shell for Phase 1 and re-add in Phase 2 when it does something useful).

If range buttons feel half-broken, simpler: in Phase 1, delete the Range row from `DashboardShell` and keep only Compare. Add a comment that range will return in Phase 2.

- [ ] **Step 5: Commit**

```bash
git add lib/services/staff-analytics.ts app/\(staff\)/dashboard/page.tsx tests/services/staff-analytics-hero.test.ts
git commit -m "Dashboard: thread AnalyticsCtx into Overview page (range→periodStart for now)"
```

---

## Task 12: Stub the three missing tab routes

**Files:**
- Create: `app/(staff)/dashboard/tenants/page.tsx`
- Create: `app/(staff)/dashboard/utilities/page.tsx`
- Create: `app/(staff)/dashboard/trust/page.tsx`

- [ ] **Step 1: Write the Tenants stub**

Create `app/(staff)/dashboard/tenants/page.tsx`:

```tsx
import { Users } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default function StaffDashboardTenantsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Tenants"
        description="Application funnel, TPN status, affordability, and applicant source mix."
      />
      <Card className="overflow-hidden border border-border p-0">
        <EmptyState
          icon={<Users className="size-5" />}
          title="Coming in Phase 4"
          description="Tenant analytics — applications funnel, TPN gates, affordability distribution — will land here in Phase 4 of the dashboard rollout."
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Write the Utilities stub**

Create `app/(staff)/dashboard/utilities/page.tsx`:

```tsx
import { Zap } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default function StaffDashboardUtilitiesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Utilities"
        description="Recovery rate, consumption trends, top consumers, tariff coverage, and anomaly alerts."
      />
      <Card className="overflow-hidden border border-border p-0">
        <EmptyState
          icon={<Zap className="size-5" />}
          title="Coming in Phase 4"
          description="Utility analytics — recovery vs shortfall, consumption by type, top-consuming units — will land here in Phase 4 of the dashboard rollout."
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Write the Trust stub**

Create `app/(staff)/dashboard/trust/page.tsx`:

```tsx
import { ShieldCheck } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default function StaffDashboardTrustPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Trust"
        description="Trust balance per landlord, reconciliation status, and audit volume."
      />
      <Card className="overflow-hidden border border-border p-0">
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          title="Coming in Phase 4"
          description="Trust analytics — per-landlord balances, reconciliation health, audit-log volume — will land here in Phase 4 of the dashboard rollout."
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Type-check + dev smoke**

```
npx tsc --noEmit
npm run lint
npm run dev
```

Expected: navigating to `/dashboard/tenants`, `/dashboard/utilities`, `/dashboard/trust` shows the empty state under the shared shell (with the tab bar). The active tab highlights correctly.

- [ ] **Step 5: Commit**

```bash
git add app/\(staff\)/dashboard/tenants/page.tsx app/\(staff\)/dashboard/utilities/page.tsx app/\(staff\)/dashboard/trust/page.tsx
git commit -m "Dashboard: add Tenants/Utilities/Trust tab stubs (Phase 4 placeholders)"
```

---

## Task 13: Update `CODEBASE.md` manifest

**Files:**
- Modify: `CODEBASE.md`

- [ ] **Step 1: Update the analytics section**

Add the following entries (locate existing analytics tables and append):

`lib/analytics/` table — add no rows (`kpis.ts` already there; the new ids are inside it).

`lib/services/` table — modify the `staff-analytics.ts` row to mention new return fields:

```
| staff-analytics.ts | … getStaffCommandCenter (extended: kpis includes NET_RENTAL_INCOME / RENT_BILLED / RENT_COLLECTED / URGENT_MAINTENANCE; adds kpiSparks per-KPI 12-mo series and collectionsCombo for billed/collected/prior overlay) … | <new line count> |
```

`components/analytics/` table — add:

```
| components/analytics/sparkline.tsx | `Sparkline`, `sparklinePathD()` — pure SVG mini area chart used by KpiTile | 60 |
| components/analytics/charts/combo-chart.tsx | `ComboChart`, `ComboChartPoint` — Recharts ComposedChart line+bars with optional dashed prior-period overlay | 145 |
| components/analytics/dashboard-shell.tsx | `DashboardShell` — sticky 8-tab nav + range/compare URL-filter bar wrapping all `/dashboard/*` routes | 100 |
```

`lib/analytics/` table — add:

```
| ctx.ts | `AnalyticsCtx`, `resolveAnalyticsCtx(searchParams, base)` — URL→typed analytics context with date range + compare + scope filters | 60 |
```

`lib/zod/` table — add:

```
| analytics.ts | `analyticsSearchParamsSchema`, `rangePresetSchema`, `compareModeSchema` | 20 |
```

`app/ — Layouts & Pages` table — modify the `/dashboard` row description and add three rows:

```
| /dashboard | (staff)/dashboard/page.tsx | Staff Overview: 7-KPI hero band with sparklines, Invoiced-vs-Collected combo chart with prior-period overlay, status strip, map + ranked lists, maintenance-by-status |
| — | (staff)/dashboard/layout.tsx | Wraps all `/dashboard/*` routes with `DashboardShell` (sticky tab bar + range/compare URL filters) |
| /dashboard/tenants | (staff)/dashboard/tenants/page.tsx | Tab stub — Phase 4 placeholder |
| /dashboard/utilities | (staff)/dashboard/utilities/page.tsx | Tab stub — Phase 4 placeholder |
| /dashboard/trust | (staff)/dashboard/trust/page.tsx | Tab stub — Phase 4 placeholder |
```

- [ ] **Step 2: Commit**

```bash
git add CODEBASE.md
git commit -m "Manifest: refresh analytics entries for Phase 1 dashboard work"
```

---

## Verification & wrap-up

Run the full suite once all 12 tasks land:

```
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: green across the board. Open the dev server and confirm:
1. `/dashboard` shows 7 KPI tiles with sparklines.
2. `/dashboard` shows the combo chart with bars + 2 lines (current solid, prior dashed).
3. The status strip includes `Urgent maintenance` count.
4. The sticky tab bar shows 8 tabs; active tab highlighted.
5. `Compare = off` removes the dashed line from the combo chart? — Phase 1 does NOT wire this; the dashed line shows whenever 24 months of snapshots exist. Phase 2 will gate it on `compare`.
6. `/dashboard/tenants`, `/dashboard/utilities`, `/dashboard/trust` show "Coming in Phase 4" placeholders.

If any step fails, fix the underlying service or component — never skip hooks or commit broken state.
