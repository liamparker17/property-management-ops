# Dashboard Analytics — Phase 2a Implementation Plan (Overview body tiles)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill out the Overview cockpit grid with the 8 missing tiles defined in the curated v1 inventory: arrears aging horizontal stacked bar, occupancy donut, lease expiry buckets stacked bar, maintenance spend 12-month line, urgent maintenance tile + list, utility recovery / shortfall tile, top-10 overdue tenants table with mini-bars, and property health ranking with composite score. Drill-in framework is deferred to Phase 2b.

**Architecture:** Same approach as Phase 1 — extend existing `staff-analytics.ts` service with new return-type fields, build new presentational components in `components/analytics/`, integrate into the Overview page. Reuse `BarChart`, `DonutChart`, `AreaChart` primitives where possible; add only `AgingBar` and `TopOverdueTable` as new primitives.

**Tech stack:** Same as Phase 1 — Next.js 16.2, Recharts, Tailwind 4 + shadcn, `node:test` with tsx.

**Existing context (post-Phase-1):**
- `getStaffCommandCenter(ctx, filters?)` returns `{ kpis, priorKpis, kpiSparks, expiringLeases, topArrears, openMaintenance, blockedApprovals, portfolioPins, collectionsTrend, collectionsCombo, maintenanceByStatus }` plus `periodStart`. `filters` accepts `{ periodStart?: Date; compare?: 'prior'|'yoy'|'off' }`.
- `getStaffPortfolio` returns `{ periodStart, rows, pins }`. Each row has occupancy, openMaintenance, arrearsCents, grossRentCents — but **no composite health score yet**.
- 7-tile hero band, ComboChart, sticky 8-tab shell already live.
- Tests stub `db.*` methods on the real Prisma module (canonical pattern in `tests/services/applications.test.ts`).

---

## File Map

**Create:**
- `components/analytics/charts/aging-bar.tsx` — horizontal stacked single-bar primitive
- `components/analytics/top-overdue-table.tsx` — table with relative-amount mini-bars
- Test files paired with each new component and each new service field.

**Modify:**
- `lib/services/staff-analytics.ts` — extend `StaffCommandCenter` with: `arrearsAging`, `occupancyBreakdown`, `leaseExpiryBuckets`, `maintenanceSpendTrend`, `urgentMaintenanceList`, `utilityRecovery`. Extend `topArrears` rows with a `fraction` field. Extend `PortfolioView` rows with `healthScore`.
- `app/(staff)/dashboard/page.tsx` — add a 4-up grid (aging, occupancy donut, expiry buckets, maintenance spend) and a 3-up grid (top overdue table, urgent maint list, utility recovery) below the combo chart. Property health ranking goes near the bottom.
- `CODEBASE.md` — refresh.

---

## Task 1: `AgingBar` primitive

**Files:**
- Create: `components/analytics/charts/aging-bar.tsx`
- Test: `tests/components/aging-bar.test.tsx`

- [ ] **Step 1: failing test**

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { AgingBar, type AgingSegment } from '@/components/analytics/charts/aging-bar';

const segments: AgingSegment[] = [
  { id: '0-30', label: '0–30', cents: 50_000_00 },
  { id: '31-60', label: '31–60', cents: 30_000_00 },
  { id: '61-90', label: '61–90', cents: 15_000_00 },
  { id: '90+', label: '90+', cents: 5_000_00 },
];

describe('<AgingBar />', () => {
  it('renders segments with widths proportional to amounts', () => {
    const html = renderToString(<AgingBar segments={segments} />);
    assert.match(html, /50%/, 'first segment is half of total');
    assert.match(html, /30%/);
    assert.match(html, /15%/);
    assert.match(html, /5%/);
  });

  it('renders an empty-state when total is zero', () => {
    const empty = segments.map((s) => ({ ...s, cents: 0 }));
    const html = renderToString(<AgingBar segments={empty} />);
    assert.match(html, /No arrears/);
  });

  it('shows segment labels and ZAR amounts in the legend', () => {
    const html = renderToString(<AgingBar segments={segments} />);
    assert.match(html, /0–30/);
    assert.match(html, /R\s?500/);
  });
});
```

- [ ] **Step 2: run, verify fail**

`node --import tsx --test tests/components/aging-bar.test.tsx` → cannot resolve module.

- [ ] **Step 3: implement**

Create `components/analytics/charts/aging-bar.tsx`:

```tsx
import { chartTheme, getSeriesPalette } from '@/lib/analytics/chart-theme';
import { formatZar } from '@/lib/format';
import { cn } from '@/lib/utils';

export type AgingSegment = {
  id: string;
  label: string;
  cents: number;
};

type AgingBarProps = {
  segments: AgingSegment[];
  className?: string;
};

export function AgingBar({ segments, className }: AgingBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.cents), 0);
  if (total === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-muted-foreground', className)}>
        No arrears outstanding
      </div>
    );
  }
  const palette = getSeriesPalette(segments.length);
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-6 w-full overflow-hidden rounded-sm border border-border">
        {segments.map((segment, i) => {
          const pct = total > 0 ? (Math.max(0, segment.cents) / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={segment.id}
              title={`${segment.label}: ${formatZar(segment.cents)}`}
              style={{ width: `${pct}%`, background: palette[i] }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {segments.map((segment, i) => (
          <div key={segment.id} className="flex items-center gap-2">
            <span aria-hidden className="inline-block size-2 rounded-sm" style={{ background: palette[i] }} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{segment.label}</div>
              <div className="font-medium text-foreground">{formatZar(segment.cents)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git add components/analytics/charts/aging-bar.tsx tests/components/aging-bar.test.tsx
git commit -m "components: add AgingBar (horizontal stacked single-bar with legend)"
```

---

## Task 2: Service — `arrearsAging`

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: append to `tests/services/staff-analytics-hero.test.ts`

`getStaffFinance` already returns `arrearsBuckets` (vertical-bar shape). For Phase 2a we need the same data on the Overview via `getStaffCommandCenter`, in the AgingBar's `AgingSegment[]` shape.

- [ ] **Step 1: failing test**

```ts
describe('getStaffCommandCenter — arrearsAging', () => {
  it('returns 4 aging buckets summed from overdue invoices', async () => {
    const now = new Date();
    db.invoice.findMany = async (args: any) => {
      // simulate four invoices, one per bucket
      return [
        { id: 'i1', totalCents: 10_000_00, amountCents: 10_000_00, dueDate: new Date(now.getTime() - 10 * 86400000), paidAt: null, status: 'OVERDUE' },
        { id: 'i2', totalCents: 20_000_00, amountCents: 20_000_00, dueDate: new Date(now.getTime() - 45 * 86400000), paidAt: null, status: 'OVERDUE' },
        { id: 'i3', totalCents: 30_000_00, amountCents: 30_000_00, dueDate: new Date(now.getTime() - 75 * 86400000), paidAt: null, status: 'OVERDUE' },
        { id: 'i4', totalCents: 40_000_00, amountCents: 40_000_00, dueDate: new Date(now.getTime() - 120 * 86400000), paidAt: null, status: 'OVERDUE' },
      ];
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    const ids = result.arrearsAging.map((s: any) => s.id);
    assert.deepEqual(ids, ['0-30', '31-60', '61-90', '90+']);
    const byId = Object.fromEntries(result.arrearsAging.map((s: any) => [s.id, s.cents]));
    assert.equal(byId['0-30'], 10_000_00);
    assert.equal(byId['31-60'], 20_000_00);
    assert.equal(byId['61-90'], 30_000_00);
    assert.equal(byId['90+'], 40_000_00);
  });
});
```

- [ ] **Step 2: run, verify fail**

`node --import tsx --test tests/services/staff-analytics-hero.test.ts`

- [ ] **Step 3: implement**

In `lib/services/staff-analytics.ts`:

3a. Add to imports near the type block:

```ts
import type { AgingSegment } from '@/components/analytics/charts/aging-bar';
```

3b. Extend `StaffCommandCenter` type (insert `arrearsAging: AgingSegment[];` near `topArrears`).

3c. Add a helper near other private helpers:

```ts
async function getArrearsAging(ctx: RouteCtx, now: Date): Promise<AgingSegment[]> {
  const propertyIds = await getPropertyIds(ctx);
  if (propertyIds.length === 0) {
    return [
      { id: '0-30', label: '0–30 days', cents: 0 },
      { id: '31-60', label: '31–60 days', cents: 0 },
      { id: '61-90', label: '61–90 days', cents: 0 },
      { id: '90+', label: '90+ days', cents: 0 },
    ];
  }
  const overdue = await db.invoice.findMany({
    where: {
      orgId: ctx.orgId,
      paidAt: null,
      status: { in: ['DUE', 'OVERDUE'] },
      dueDate: { lt: now },
      lease: { unit: { propertyId: { in: propertyIds } } },
    },
    select: { totalCents: true, amountCents: true, dueDate: true },
  });
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const inv of overdue) {
    const cents = inv.totalCents > 0 ? inv.totalCents : inv.amountCents;
    const ageDays = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000);
    if (ageDays <= 30) buckets['0-30'] += cents;
    else if (ageDays <= 60) buckets['31-60'] += cents;
    else if (ageDays <= 90) buckets['61-90'] += cents;
    else buckets['90+'] += cents;
  }
  return [
    { id: '0-30', label: '0–30 days', cents: buckets['0-30'] },
    { id: '31-60', label: '31–60 days', cents: buckets['31-60'] },
    { id: '61-90', label: '61–90 days', cents: buckets['61-90'] },
    { id: '90+', label: '90+ days', cents: buckets['90+'] },
  ];
}
```

3d. Inside `getStaffCommandCenter`, await it (alongside the other `Promise.all` siblings or as a separate await), then thread `arrearsAging` into the return literal.

```ts
const arrearsAging = await getArrearsAging(ctx, now);
// then in return:
//   arrearsAging,
```

(Use the existing `now` already in scope. If not present at that point in the function, declare `const now = new Date();` near the top.)

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git add lib/services/staff-analytics.ts tests/services/staff-analytics-hero.test.ts
git commit -m "staff-analytics: return arrearsAging buckets (0-30/31-60/61-90/90+) on Overview"
```

---

## Task 3: Service — `occupancyBreakdown`

The existing `getStaffCommandCenter` already pulls per-unit occupancies via `getUnitOccupancy` inside the `dashboard.ts` legacy service path — but not in `staff-analytics.ts`. We compute the breakdown live from `Unit` + active `Lease` data via the existing snapshot's `occupiedUnits`/`totalUnits` plus a small live query for upcoming/conflict counts.

For Phase 2a simplicity, derive directly from snapshot:
- `occupied = currentSnapshot.occupiedUnits`
- `vacant = currentSnapshot.totalUnits - currentSnapshot.occupiedUnits`
- `upcoming = 0` (deferred to a Phase 3 enrichment)
- `total = currentSnapshot.totalUnits`

This is acceptable because the Overview shows a 3-segment donut (Occupied / Vacant / Total label) — sufficient for Phase 2a. Phase 3 can refine.

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: append to `tests/services/staff-analytics-hero.test.ts`

- [ ] **Step 1: failing test**

```ts
describe('getStaffCommandCenter — occupancyBreakdown', () => {
  it('returns occupied/vacant counts from the current org snapshot', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.occupancyBreakdown.occupied, 18);
    assert.equal(result.occupancyBreakdown.vacant, 2);
    assert.equal(result.occupancyBreakdown.total, 20);
  });
});
```

(The existing `beforeEach` already sets `occupiedUnits: 18, totalUnits: 20` on the snapshot mock.)

- [ ] **Step 2: run, fail**
- [ ] **Step 3: implement**

3a. Extend `StaffCommandCenter`:

```ts
occupancyBreakdown: { occupied: number; vacant: number; total: number };
```

3b. In `getStaffCommandCenter`, build it from `currentSnapshot`:

```ts
const occupancyBreakdown = {
  occupied: currentSnapshot?.occupiedUnits ?? 0,
  vacant: Math.max(0, (currentSnapshot?.totalUnits ?? 0) - (currentSnapshot?.occupiedUnits ?? 0)),
  total: currentSnapshot?.totalUnits ?? 0,
};
```

3c. Add `occupancyBreakdown` to the return literal.

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "staff-analytics: return occupancyBreakdown (occupied/vacant/total) on Overview"
```

---

## Task 4: Service — `leaseExpiryBuckets`

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: append

- [ ] **Step 1: failing test**

```ts
describe('getStaffCommandCenter — leaseExpiryBuckets', () => {
  it('returns 4 expiry buckets counting active leases by days-until-end', async () => {
    const now = new Date();
    db.lease.findMany = async () => [
      { endDate: new Date(now.getTime() + 10 * 86400000) },
      { endDate: new Date(now.getTime() + 50 * 86400000) },
      { endDate: new Date(now.getTime() + 50 * 86400000) },
      { endDate: new Date(now.getTime() + 80 * 86400000) },
      { endDate: new Date(now.getTime() + 200 * 86400000) },
    ];
    const result = await getStaffCommandCenter(ROUTE_CTX);
    const byId = Object.fromEntries(result.leaseExpiryBuckets.map((b: any) => [b.id, b.count]));
    assert.equal(byId['0-30'], 1);
    assert.equal(byId['31-60'], 2);
    assert.equal(byId['61-90'], 1);
    assert.equal(byId['90+'], 1);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

3a. Extend `StaffCommandCenter`:

```ts
leaseExpiryBuckets: { id: string; label: string; count: number }[];
```

3b. Helper:

```ts
async function getLeaseExpiryBuckets(ctx: RouteCtx, now: Date): Promise<Array<{ id: string; label: string; count: number }>> {
  const propertyIds = await getPropertyIds(ctx);
  if (propertyIds.length === 0) {
    return [
      { id: '0-30', label: '0–30 days', count: 0 },
      { id: '31-60', label: '31–60 days', count: 0 },
      { id: '61-90', label: '61–90 days', count: 0 },
      { id: '90+', label: '90+ days', count: 0 },
    ];
  }
  const leases = await db.lease.findMany({
    where: {
      orgId: ctx.orgId,
      state: { in: ['ACTIVE', 'RENEWED'] },
      endDate: { gte: now },
      unit: { propertyId: { in: propertyIds } },
    },
    select: { endDate: true },
  });
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const l of leases) {
    const days = Math.ceil((l.endDate.getTime() - now.getTime()) / 86400000);
    if (days <= 30) buckets['0-30'] += 1;
    else if (days <= 60) buckets['31-60'] += 1;
    else if (days <= 90) buckets['61-90'] += 1;
    else buckets['90+'] += 1;
  }
  return [
    { id: '0-30', label: '0–30 days', count: buckets['0-30'] },
    { id: '31-60', label: '31–60 days', count: buckets['31-60'] },
    { id: '61-90', label: '61–90 days', count: buckets['61-90'] },
    { id: '90+', label: '90+ days', count: buckets['90+'] },
  ];
}
```

3c. Await + thread into return.

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "staff-analytics: return leaseExpiryBuckets (0-30/31-60/61-90/90+) on Overview"
```

---

## Task 5: Service — `maintenanceSpendTrend`

A 12-month series of org-wide maintenance spend, sourced from `LandlordMonthlySnapshot.maintenanceSpendCents` aggregated across landlords per month.

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: append

- [ ] **Step 1: failing test**

```ts
describe('getStaffCommandCenter — maintenanceSpendTrend', () => {
  it('returns a 12-month trend summed from landlord snapshots', async () => {
    db.landlordMonthlySnapshot.groupBy = async (args: any) => {
      // emit one row per period in the requested range
      const lte = args.where.periodStart.lte as Date;
      const gte = args.where.periodStart.gte as Date;
      const months: Date[] = [];
      const cursor = new Date(gte);
      while (cursor <= lte) {
        months.push(new Date(cursor));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return months.map((d, idx) => ({
        periodStart: d,
        _sum: { maintenanceSpendCents: 5_000_00 + idx * 1_000_00 },
      }));
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.maintenanceSpendTrend.length, 12);
    for (const point of result.maintenanceSpendTrend) {
      assert.equal(typeof point.x, 'string');
      assert.equal(typeof point.y, 'number');
    }
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

3a. Extend `StaffCommandCenter`:

```ts
maintenanceSpendTrend: ChartPoint[];
```

3b. Helper:

```ts
async function getMaintenanceSpendTrend(ctx: RouteCtx, periodStart: Date): Promise<ChartPoint[]> {
  const from = addMonths(periodStart, -11);
  const groups = await db.landlordMonthlySnapshot.groupBy({
    by: ['periodStart'],
    where: { orgId: ctx.orgId, periodStart: { gte: from, lte: periodStart } },
    _sum: { maintenanceSpendCents: true },
  });
  const map = new Map<string, number>();
  for (const g of groups) {
    map.set(keyForMonth(g.periodStart as Date), g._sum.maintenanceSpendCents ?? 0);
  }
  return Array.from({ length: 12 }, (_, i) => addMonths(periodStart, i - 11)).map((m) => ({
    x: labelForMonth(m),
    y: map.get(keyForMonth(m)) ?? 0,
  }));
}
```

3c. Await + thread into return.

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "staff-analytics: return maintenanceSpendTrend (12-mo aggregate from landlord snapshots)"
```

---

## Task 6: Service — `urgentMaintenanceList`

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: append

- [ ] **Step 1: failing test**

```ts
describe('getStaffCommandCenter — urgentMaintenanceList', () => {
  it('returns the top 5 OPEN/IN_PROGRESS HIGH/URGENT requests', async () => {
    db.maintenanceRequest.findMany = async (args: any) => {
      // assert filter shape, then return 3 rows with shape similar to existing getOpenMaintenance
      assert.deepEqual(args.where.priority, { in: ['HIGH', 'URGENT'] });
      assert.deepEqual(args.where.status, { in: ['OPEN', 'IN_PROGRESS'] });
      return [
        { id: 'm1', title: 'Burst geyser', priority: 'URGENT', status: 'OPEN', scheduledFor: null, unit: { label: '12B', property: { name: 'Acme Tower' } } },
        { id: 'm2', title: 'Power out', priority: 'HIGH', status: 'IN_PROGRESS', scheduledFor: null, unit: { label: '5A', property: { name: 'Beta House' } } },
      ];
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.urgentMaintenanceList.length, 2);
    assert.equal(result.urgentMaintenanceList[0].title, 'Burst geyser');
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

3a. Extend `StaffCommandCenter`:

```ts
urgentMaintenanceList: MaintenanceRow[];
```

3b. Reuse the existing `getOpenMaintenance` helper signature (it accepts a `filters?: { status?: MaintenanceStatus }`). Add a new variant or extend:

The simplest path: a new helper `getUrgentMaintenance(ctx, limit = 5)` that mirrors `getOpenMaintenance` but filters on `priority: { in: ['HIGH', 'URGENT'] }`:

```ts
async function getUrgentMaintenance(ctx: RouteCtx, limit = 5): Promise<MaintenanceRow[]> {
  const propertyIds = await getPropertyIds(ctx);
  if (propertyIds.length === 0) return [];
  const rows = await db.maintenanceRequest.findMany({
    where: {
      orgId: ctx.orgId,
      priority: { in: ['HIGH', 'URGENT'] },
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      unit: { propertyId: { in: propertyIds } },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    include: {
      unit: { include: { property: { select: { name: true } } } },
    },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: `${row.unit.property.name} / ${row.unit.label}`,
    status: row.status,
    priority: row.priority,
    scheduledFor: row.scheduledFor,
    href: `/maintenance/${row.id}`,
    vendorName: null,
  }));
}
```

3c. Await it in `getStaffCommandCenter`, thread `urgentMaintenanceList` into return.

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "staff-analytics: return urgentMaintenanceList (top-5 HIGH/URGENT open requests)"
```

---

## Task 7: Service — `utilityRecovery`

Phase-1 spec note: until `MunicipalBill` model lands, utility recovery is a **proxy** = utility-line-item billed minus utility-line-item collected.

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: append

- [ ] **Step 1: failing test**

```ts
describe('getStaffCommandCenter — utilityRecovery', () => {
  it('returns billedCents and collectedCents totals from utility line items', async () => {
    db.invoiceLineItem.aggregate = async (args: any) => {
      // sum amountCents over UTILITY_* kinds
      const isUtilityKind = (args.where.kind as any).in?.every((k: string) => k.startsWith('UTILITY_'));
      assert.ok(isUtilityKind, 'where.kind must filter on UTILITY_*');
      return { _sum: { amountCents: 200_000_00 } };
    };
    db.allocation.aggregate = async () => ({ _sum: { amountCents: 145_000_00 } });
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.utilityRecovery.billedCents, 200_000_00);
    assert.equal(result.utilityRecovery.collectedCents, 145_000_00);
    assert.equal(result.utilityRecovery.shortfallCents, 55_000_00);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

3a. Extend `StaffCommandCenter`:

```ts
utilityRecovery: { billedCents: number; collectedCents: number; shortfallCents: number };
```

3b. Helper:

```ts
async function getUtilityRecovery(ctx: RouteCtx, periodStart: Date): Promise<{ billedCents: number; collectedCents: number; shortfallCents: number }> {
  const propertyIds = await getPropertyIds(ctx);
  if (propertyIds.length === 0) return { billedCents: 0, collectedCents: 0, shortfallCents: 0 };
  // Window = same month as periodStart through one month after (inclusive month)
  const periodEnd = addMonths(periodStart, 1);
  const utilityKinds = ['UTILITY_WATER', 'UTILITY_ELECTRICITY', 'UTILITY_GAS', 'UTILITY_SEWER', 'UTILITY_REFUSE'] as const;
  const billed = await db.invoiceLineItem.aggregate({
    where: {
      kind: { in: utilityKinds as unknown as string[] },
      invoice: {
        orgId: ctx.orgId,
        periodStart: { gte: periodStart, lt: periodEnd },
        lease: { unit: { propertyId: { in: propertyIds } } },
      },
    },
    _sum: { amountCents: true },
  });
  const collected = await db.allocation.aggregate({
    where: {
      reversedAt: null,
      target: 'INVOICE_LINE_ITEM',
      invoiceLineItem: {
        kind: { in: utilityKinds as unknown as string[] },
        invoice: {
          orgId: ctx.orgId,
          periodStart: { gte: periodStart, lt: periodEnd },
          lease: { unit: { propertyId: { in: propertyIds } } },
        },
      },
    },
    _sum: { amountCents: true },
  });
  const billedCents = billed._sum.amountCents ?? 0;
  const collectedCents = collected._sum.amountCents ?? 0;
  return {
    billedCents,
    collectedCents,
    shortfallCents: Math.max(0, billedCents - collectedCents),
  };
}
```

3c. Await it, thread `utilityRecovery` into return.

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "staff-analytics: return utilityRecovery (billed/collected/shortfall over utility line items)"
```

---

## Task 8: Extend `topArrears` rows with `fraction`

Existing `ArrearsRow` is `{ id, title, subtitle, amountCents, href }`. The TopOverdueTable needs a relative-bar fraction (this row's amount ÷ max amount in the set, clamped 0..1).

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: append

- [ ] **Step 1: failing test**

```ts
describe('getStaffCommandCenter — topArrears.fraction', () => {
  it('attaches a fraction (0..1) to each row, with the largest = 1', async () => {
    db.invoice.findMany = async () => [
      { id: 'i1', totalCents: 100_000_00, amountCents: 100_000_00, leaseId: 'l1', dueDate: new Date(), status: 'OVERDUE', paidAt: null,
        lease: { unit: { property: { name: 'A' }, label: '1' }, tenants: [{ tenant: { firstName: 'Alice', lastName: 'L' } }] } },
      { id: 'i2', totalCents: 50_000_00, amountCents: 50_000_00, leaseId: 'l2', dueDate: new Date(), status: 'OVERDUE', paidAt: null,
        lease: { unit: { property: { name: 'B' }, label: '2' }, tenants: [{ tenant: { firstName: 'Bob', lastName: 'M' } }] } },
    ];
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.topArrears[0].fraction, 1);
    assert.equal(result.topArrears[1].fraction, 0.5);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

3a. Extend `ArrearsRow`:

```ts
export type ArrearsRow = {
  id: string;
  title: string;
  subtitle: string;
  amountCents: number;
  fraction: number;
  href: string;
};
```

3b. In `getTopArrears`, after building the rows but before returning, compute the max and divide:

```ts
const max = rows.reduce((m, r) => Math.max(m, r.totalCents > 0 ? r.totalCents : r.amountCents), 0);
return rows.map((row) => {
  const cents = row.totalCents > 0 ? row.totalCents : row.amountCents;
  return {
    id: row.id,
    title: ...,
    subtitle: ...,
    amountCents: cents,
    fraction: max > 0 ? cents / max : 0,
    href: ...,
  };
});
```

(Read the existing `getTopArrears` body and add the `fraction` field to the existing return mapping — preserve all other fields and don't drop the existing query shape.)

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "staff-analytics: attach relative fraction to topArrears rows for mini-bars"
```

---

## Task 9: Property health composite score

**Files:**
- Modify: `lib/services/staff-analytics.ts` (the `getStaffPortfolio` exported function and `PropertyAnalyticsRow` type)
- Test: `tests/services/staff-analytics-portfolio.test.ts` (create)

- [ ] **Step 1: failing test**

```ts
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let getStaffPortfolio: any;
let originalSnapshotFindMany: any;
let originalPropertyFindMany: any;
let originalMaintenanceCount: any;
let originalLeaseFindMany: any;

const ORG_ID = 'org_p2a';
const ROUTE_CTX = { orgId: ORG_ID, userId: 'u', role: 'ADMIN' as const };

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalSnapshotFindMany = db.propertyMonthlySnapshot.findMany;
  originalPropertyFindMany = db.property.findMany;
  originalMaintenanceCount = db.maintenanceRequest.count;
  originalLeaseFindMany = db.lease.findMany;
  ({ getStaffPortfolio } = await import('@/lib/services/staff-analytics'));
});

after(() => {
  db.propertyMonthlySnapshot.findMany = originalSnapshotFindMany;
  db.property.findMany = originalPropertyFindMany;
  db.maintenanceRequest.count = originalMaintenanceCount;
  db.lease.findMany = originalLeaseFindMany;
});

beforeEach(() => {
  db.property.findMany = async () => [
    { id: 'p1', name: 'Tower A', addressLine1: '', suburb: 's', city: 'Johannesburg', province: 'GP', latitude: null, longitude: null,
      landlord: { id: 'l1', name: 'L1' }, assignedAgent: null },
  ];
  db.propertyMonthlySnapshot.findMany = async () => [
    { orgId: ORG_ID, propertyId: 'p1', periodStart: new Date(), occupiedUnits: 9, totalUnits: 10, openMaintenance: 1, arrearsCents: 0, grossRentCents: 100_000_00 },
  ];
  db.maintenanceRequest.count = async () => 0;
  db.lease.findMany = async () => [];
});

describe('getStaffPortfolio — healthScore', () => {
  it('attaches a healthScore in 0..100 to each row', async () => {
    const result = await getStaffPortfolio(ROUTE_CTX);
    const row = result.rows[0];
    assert.ok(typeof row.healthScore === 'number', 'healthScore is a number');
    assert.ok(row.healthScore >= 0 && row.healthScore <= 100);
  });

  it('weights occupancy at 30% — drops score when occupancy drops', async () => {
    const r1 = await getStaffPortfolio(ROUTE_CTX);
    const high = r1.rows[0].healthScore;
    db.propertyMonthlySnapshot.findMany = async () => [
      { orgId: ORG_ID, propertyId: 'p1', periodStart: new Date(), occupiedUnits: 5, totalUnits: 10, openMaintenance: 1, arrearsCents: 0, grossRentCents: 100_000_00 },
    ];
    const r2 = await getStaffPortfolio(ROUTE_CTX);
    assert.ok(r2.rows[0].healthScore < high);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

3a. Extend `PropertyAnalyticsRow`:

```ts
export type PropertyAnalyticsRow = {
  id: string;
  name: string;
  // ... existing fields ...
  healthScore: number;
};
```

3b. In `getStaffPortfolio`, after the existing rows are built, attach a `healthScore`. The composite from the spec is:

`score = 0.4 * collectionRate + 0.3 * occupancy + 0.2 * (1 - urgentMaintRatio) + 0.1 * (1 - leaseExpiryRisk)`

For Phase 2a we approximate with what we have on hand:
- `collectionRate` ≈ for the property: 1 if `arrearsCents === 0`, else `1 - min(1, arrearsCents / max(grossRentCents, 1))`
- `occupancy` ≈ `occupiedUnits / max(totalUnits, 1)`
- `urgentMaintRatio` ≈ `min(1, openMaintenance / max(totalUnits, 1))`
- `leaseExpiryRisk` ≈ `0` for now (Phase 3)

```ts
function computeHealthScore(row: { occupiedUnits: number; totalUnits: number; arrearsCents: number; grossRentCents: number; openMaintenance: number }): number {
  const occupancy = row.totalUnits > 0 ? row.occupiedUnits / row.totalUnits : 0;
  const collectionRate = row.grossRentCents > 0 ? Math.max(0, 1 - row.arrearsCents / row.grossRentCents) : 1;
  const urgentRatio = row.totalUnits > 0 ? Math.min(1, row.openMaintenance / row.totalUnits) : 0;
  const score = 0.4 * collectionRate + 0.3 * occupancy + 0.2 * (1 - urgentRatio) + 0.1 * 1;
  return Math.round(Math.max(0, Math.min(1, score)) * 100);
}
```

(Apply within the existing `getStaffPortfolio` function — locate the row-mapping section and add `healthScore: computeHealthScore({ ... })` to each row.)

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git add lib/services/staff-analytics.ts tests/services/staff-analytics-portfolio.test.ts
git commit -m "staff-analytics: attach composite healthScore to PortfolioView rows"
```

---

## Task 10: `TopOverdueTable` component

**Files:**
- Create: `components/analytics/top-overdue-table.tsx`
- Test: `tests/components/top-overdue-table.test.tsx`

- [ ] **Step 1: failing test**

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { TopOverdueTable, type TopOverdueRow } from '@/components/analytics/top-overdue-table';

const rows: TopOverdueRow[] = [
  { id: 'a', title: 'Acme / 12B', subtitle: 'Alice Tenant', amountCents: 100_000_00, fraction: 1, href: '/leases/a' },
  { id: 'b', title: 'Beta / 5A',  subtitle: 'Bob Tenant',   amountCents: 50_000_00,  fraction: 0.5, href: '/leases/b' },
];

describe('<TopOverdueTable />', () => {
  it('renders one <tr> per row and a mini-bar element with proportional width', () => {
    const html = renderToString(<TopOverdueTable rows={rows} />);
    assert.match(html, /<tr/);
    assert.match(html, /Acme \/ 12B/);
    assert.match(html, /Beta \/ 5A/);
    assert.match(html, /width:\s*100%/);
    assert.match(html, /width:\s*50%/);
  });

  it('renders an empty-state when rows is empty', () => {
    const html = renderToString(<TopOverdueTable rows={[]} />);
    assert.match(html, /No overdue/i);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

```tsx
import Link from 'next/link';

import { chartTheme } from '@/lib/analytics/chart-theme';
import { formatZar } from '@/lib/format';
import { cn } from '@/lib/utils';

export type TopOverdueRow = {
  id: string;
  title: string;
  subtitle: string;
  amountCents: number;
  fraction: number;
  href: string;
};

export function TopOverdueTable({ rows, className }: { rows: TopOverdueRow[]; className?: string }) {
  if (rows.length === 0) {
    return <div className={cn('py-6 text-center text-sm text-muted-foreground', className)}>No overdue accounts.</div>;
  }
  return (
    <div className={cn('overflow-hidden border border-border', className)}>
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--muted)]/40 text-left">
          <tr>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lease</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tenant</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Outstanding</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Relative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const widthPct = Math.max(0, Math.min(1, row.fraction)) * 100;
            return (
              <tr key={row.id} className="border-t border-border/60">
                <td className="px-4 py-2"><Link href={row.href} className="text-foreground underline-offset-2 hover:underline">{row.title}</Link></td>
                <td className="px-4 py-2 text-muted-foreground">{row.subtitle}</td>
                <td className="px-4 py-2 text-foreground">{formatZar(row.amountCents)}</td>
                <td className="px-4 py-2">
                  <div className="h-2 w-32 overflow-hidden rounded-sm border border-border">
                    <div style={{ width: `${widthPct}%`, height: '100%', background: chartTheme.seriesA }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git add components/analytics/top-overdue-table.tsx tests/components/top-overdue-table.test.tsx
git commit -m "components: add TopOverdueTable (sortable list with relative-amount mini-bars)"
```

---

## Task 11: Wire all 8 tiles into the Overview page

**Files:**
- Modify: `app/(staff)/dashboard/page.tsx`

No new tests for this task — the underlying service + component tests already cover the data and primitives. Page composition is type-checked.

- [ ] **Step 1: implement**

Add new imports at the top:

```tsx
import { AgingBar } from '@/components/analytics/charts/aging-bar';
import { DonutChart } from '@/components/analytics/charts/donut-chart';
import { AreaChart } from '@/components/analytics/charts/area-chart';
import { TopOverdueTable } from '@/components/analytics/top-overdue-table';
```

(Confirm `DonutChart` and `AreaChart` exist with these import paths. They do — see existing `components/analytics/charts/` directory.)

Insert the new sections in the page — between the existing ComboChart card and the existing 3-up grid. Concrete layout:

```tsx
{/* 4-up cockpit grid: aging, occupancy, expiry, maint spend */}
<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
  <Card className="border border-border p-5">
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Receivables</p>
    <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Arrears aging</h2>
    <AgingBar segments={data.arrearsAging} />
  </Card>
  <Card className="border border-border p-5">
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Portfolio</p>
    <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Occupancy</h2>
    <DonutChart
      data={[
        { id: 'occupied', label: 'Occupied', value: data.occupancyBreakdown.occupied },
        { id: 'vacant', label: 'Vacant', value: data.occupancyBreakdown.vacant },
      ]}
    />
  </Card>
  <Card className="border border-border p-5">
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Renewals</p>
    <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Lease expiries</h2>
    <BarChart data={data.leaseExpiryBuckets.map((b) => ({ x: b.label, y: b.count }))} />
  </Card>
  <Card className="border border-border p-5">
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Operations</p>
    <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Maintenance spend</h2>
    <AreaChart data={data.maintenanceSpendTrend} yFormat="cents" />
  </Card>
</div>

{/* 3-up: top overdue + urgent maintenance + utility recovery */}
<div className="grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
  <Card className="border border-border p-5">
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Finance</p>
    <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Top 10 overdue</h2>
    <TopOverdueTable rows={data.topArrears} />
  </Card>
  <Card className="border border-border p-5">
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Operations</p>
    <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Urgent maintenance</h2>
    <RankedList
      title=""
      eyebrow=""
      items={data.urgentMaintenanceList.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: `${row.subtitle} · ${row.priority}`,
        value: row.status.replace('_', ' '),
        href: row.href,
      }))}
      emptyCopy="No urgent tickets right now."
    />
  </Card>
  <Card className="border border-border p-5">
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Utilities</p>
    <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Utility recovery</h2>
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Billed</span>
        <span className="font-medium text-foreground">{formatZar(data.utilityRecovery.billedCents)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Collected</span>
        <span className="font-medium text-foreground">{formatZar(data.utilityRecovery.collectedCents)}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Shortfall</span>
        <span className="font-medium text-[color:var(--accent)]">{formatZar(data.utilityRecovery.shortfallCents)}</span>
      </div>
      <p className="pt-2 text-xs text-muted-foreground">
        Proxy: utility line items billed minus utility line items collected. True recovery rate lands when municipal-bill capture ships.
      </p>
    </div>
  </Card>
</div>
```

Place these two new grids between the Card that wraps the ComboChart (`Invoiced vs Collected`) and the existing 3-up grid `[1.4fr_1fr_1fr]` containing `MapPanel`+`RankedList`+`RankedList`. Property health ranking is **not** added in Phase 2a — the existing `/dashboard/portfolio` route (Properties tab) gets the table view from `getStaffPortfolio.rows` with the new `healthScore` column. Add a column to that page in step 2.

- [ ] **Step 2: add `healthScore` column to `/dashboard/portfolio`**

Edit `app/(staff)/dashboard/portfolio/page.tsx`. Find the existing table headers and add a "Health" column before "Gross rent":

```tsx
<th className="px-4 py-3">Health</th>
```

And in the row body, between `Arrears` and `Gross rent`:

```tsx
<td className="px-4 py-3">
  <span className={cn(
    'inline-block rounded-sm px-2 py-0.5 text-xs font-medium',
    row.healthScore >= 80 ? 'bg-green-500/10 text-green-700 dark:text-green-300' :
    row.healthScore >= 60 ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' :
    'bg-red-500/10 text-red-700 dark:text-red-300',
  )}>
    {row.healthScore}
  </span>
</td>
```

Add `import { cn } from '@/lib/utils';` if not already imported.

- [ ] **Step 3: type-check + lint + dev smoke**

```
npx tsc --noEmit
npm run lint   # may show pre-existing errors; only your new edits should be clean
npm test       # all 171 + new tests should pass
```

- [ ] **Step 4: commit**

```
git add "app/(staff)/dashboard/page.tsx" "app/(staff)/dashboard/portfolio/page.tsx"
git commit -m "Dashboard Overview + Properties: integrate 8 Phase-2a tiles (aging, occupancy donut, expiry, maint spend, top overdue, urgent list, utility recovery, health score)"
```

---

## Task 12: Update `CODEBASE.md` manifest

**Files:**
- Modify: `CODEBASE.md`

- [ ] **Step 1: edit**

Add to `components/analytics/` table:

```
| components/analytics/charts/aging-bar.tsx | `AgingBar`, `AgingSegment` — horizontal stacked single-bar with legend (used for arrears aging) | 60 |
| components/analytics/top-overdue-table.tsx | `TopOverdueTable`, `TopOverdueRow` — table with relative-amount mini-bars | 65 |
```

Update the `lib/services/staff-analytics.ts` row description to mention the new return fields:

```
| staff-analytics.ts | `getStaffCommandCenter(ctx, filters?)` (Phase 2a: returns `arrearsAging`, `occupancyBreakdown`, `leaseExpiryBuckets`, `maintenanceSpendTrend`, `urgentMaintenanceList`, `utilityRecovery`; topArrears rows include `fraction`); `getStaffPortfolio` (rows include `healthScore`); … | <new line count> |
```

(Use `wc -l lib/services/staff-analytics.ts` for the new line count.)

Update the `/dashboard` and `/dashboard/portfolio` row descriptions to mention the new tiles + health column.

- [ ] **Step 2: commit**

```
git add CODEBASE.md
git commit -m "Manifest: refresh analytics entries for Phase 2a"
```

---

## Verification & wrap-up

After all 12 tasks land:

```
npm test          # full suite green
npx tsc --noEmit  # clean
npm run lint      # no NEW errors
npm run build     # production build succeeds
npm run dev       # confirm /dashboard renders all 8 new tiles + /dashboard/portfolio shows health column
```

**Definition of done:**
1. Overview page shows all 8 Phase 2a tiles populated from real data.
2. Properties tab shows a Health column with the composite score.
3. All new tests pass; no regressions.
4. Manifest reflects the new shape.

If any step fails, fix the underlying service or component — never skip hooks or commit broken state.
