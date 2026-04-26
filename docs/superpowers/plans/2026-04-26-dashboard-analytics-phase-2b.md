# Dashboard Analytics — Phase 2b Implementation Plan (Drill-in framework + 4 example drill-ins)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Click any of the 4 key Overview tiles (arrears aging, top overdue, lease expiries, urgent maintenance) and a side drawer slides in showing the full unfiltered detail behind that tile + a CSV export button.

**Architecture:** URL-driven drawer (no parallel-route slot). The dashboard layout reads `?drill=<tileId>` and conditionally renders a `<DrillSheet>` overlay. The sheet routes to a registry that maps `tileId` → server function returning the payload + a renderer component. Closing the drawer clears the URL param. CSV export uses a server action that streams to a download response.

**Tech stack:** Same as before. New addition: `vaul` is NOT used — a self-built drawer (focus trap + backdrop + Esc-close) keeps the dependency footprint flat. If shadcn/ui already includes a `Sheet` primitive, prefer that over rolling our own.

**Existing context to know cold:**
- Phase 1+2a is now on master (35 commits). The phase-2b branch is fresh off master. Baseline 180 tests passing.
- `getStaffCommandCenter` returns the Overview payload. We add 4 new service functions for the detailed views.
- Tile-level click target: each tile's card header gets a small "View detail" link (not a wrap-the-whole-card click) to keep accessible behaviour predictable. Link href is `?drill=<tileId>` preserving other URL params.
- Drill ids: `arrears-aging`, `top-overdue`, `lease-expiries`, `urgent-maintenance`.

---

## File Map

**Create:**
- `lib/analytics/drill.ts` — drill registry types + the four server functions
- `lib/zod/analytics-drill.ts` — drill-id enum + CSV export schema
- `components/analytics/drill-sheet.tsx` — drawer shell (client)
- `components/analytics/drill/arrears-aging-drill.tsx` — detail renderer
- `components/analytics/drill/top-overdue-drill.tsx`
- `components/analytics/drill/lease-expiries-drill.tsx`
- `components/analytics/drill/urgent-maintenance-drill.tsx`
- `app/api/analytics/drill/[tileId]/export.csv/route.ts` — CSV export endpoint
- Tests for: drill registry, drill-sheet, each drill renderer, the CSV endpoint

**Modify:**
- `app/(staff)/dashboard/layout.tsx` — read `?drill` searchParam, render `<DrillSheet>` when present
- `app/(staff)/dashboard/page.tsx` — add a "View detail →" link to each of the 4 drillable tile headers
- `CODEBASE.md`

---

## Task 1: Drill registry — types + server functions

**Files:**
- Create: `lib/analytics/drill.ts`
- Create: `lib/zod/analytics-drill.ts`
- Test: `tests/lib/analytics-drill.test.ts`

- [ ] **Step 1: failing test**

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DRILL_IDS, isDrillId } from '@/lib/analytics/drill';
import { drillIdSchema } from '@/lib/zod/analytics-drill';

describe('drill ids', () => {
  it('exposes the 4 phase-2b drill ids', () => {
    assert.deepEqual([...DRILL_IDS].sort(), ['arrears-aging', 'lease-expiries', 'top-overdue', 'urgent-maintenance']);
  });
  it('isDrillId narrows to a known id', () => {
    assert.ok(isDrillId('arrears-aging'));
    assert.equal(isDrillId('not-real'), false);
    assert.equal(isDrillId(undefined), false);
  });
  it('drillIdSchema parses known ids and rejects others', () => {
    assert.equal(drillIdSchema.parse('top-overdue'), 'top-overdue');
    assert.throws(() => drillIdSchema.parse('zzz'));
  });
});
```

- [ ] **Step 2: run, verify fail**
- [ ] **Step 3: implement**

`lib/zod/analytics-drill.ts`:

```ts
import { z } from 'zod';

export const drillIdSchema = z.enum([
  'arrears-aging',
  'top-overdue',
  'lease-expiries',
  'urgent-maintenance',
]);

export type DrillId = z.infer<typeof drillIdSchema>;
```

`lib/analytics/drill.ts`:

```ts
import type { DrillId } from '@/lib/zod/analytics-drill';
import { drillIdSchema } from '@/lib/zod/analytics-drill';

export const DRILL_IDS = drillIdSchema.options;

export function isDrillId(value: unknown): value is DrillId {
  return drillIdSchema.safeParse(value).success;
}
```

- [ ] **Step 4: green** — `node --import tsx --test tests/lib/analytics-drill.test.ts` 3/3 pass.
- [ ] **Step 5: commit**

```
git add lib/analytics/drill.ts lib/zod/analytics-drill.ts tests/lib/analytics-drill.test.ts
git commit -m "Analytics: drill registry types + Zod enum (4 phase-2b ids)"
```

---

## Task 2: Drill server functions in `staff-analytics.ts`

**Files:**
- Modify: `lib/services/staff-analytics.ts`
- Test: `tests/services/staff-analytics-drill.test.ts`

Add 4 server functions:
- `getArrearsAgingDetail(ctx)` → all overdue invoices, grouped + raw rows
- `getTopOverdueDetail(ctx)` → unbounded ranked list of overdue invoices (no `take`)
- `getLeaseExpiriesDetail(ctx)` → all upcoming lease expiries with full lease/unit/property info
- `getUrgentMaintenanceDetail(ctx)` → all OPEN/IN_PROGRESS HIGH/URGENT (not just top 5) with vendor + age

- [ ] **Step 1: failing test**

```ts
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let getArrearsAgingDetail: any;
let getTopOverdueDetail: any;
let getLeaseExpiriesDetail: any;
let getUrgentMaintenanceDetail: any;
let originalInvoiceFindMany: any;
let originalLeaseFindMany: any;
let originalMaintenanceFindMany: any;
let originalPropertyFindMany: any;

const ORG_ID = 'org_drill';
const ROUTE_CTX = { orgId: ORG_ID, userId: 'u', role: 'ADMIN' as const };

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalInvoiceFindMany = db.invoice.findMany;
  originalLeaseFindMany = db.lease.findMany;
  originalMaintenanceFindMany = db.maintenanceRequest.findMany;
  originalPropertyFindMany = db.property.findMany;
  ({ getArrearsAgingDetail, getTopOverdueDetail, getLeaseExpiriesDetail, getUrgentMaintenanceDetail } = await import('@/lib/services/staff-analytics'));
});

after(() => {
  db.invoice.findMany = originalInvoiceFindMany;
  db.lease.findMany = originalLeaseFindMany;
  db.maintenanceRequest.findMany = originalMaintenanceFindMany;
  db.property.findMany = originalPropertyFindMany;
});

beforeEach(() => {
  db.property.findMany = async () => [{ id: 'p1', name: 'P1' }];
});

describe('drill server functions', () => {
  it('getArrearsAgingDetail returns rows grouped by 4 buckets', async () => {
    const now = new Date();
    db.invoice.findMany = async () => [
      { id: 'i1', totalCents: 10_000_00, amountCents: 10_000_00, dueDate: new Date(now.getTime() - 10 * 86400000),
        leaseId: 'l1', lease: { unit: { property: { name: 'A' }, label: '1' }, tenants: [{ tenant: { firstName: 'A', lastName: 'B' } }] } },
      { id: 'i2', totalCents: 20_000_00, amountCents: 20_000_00, dueDate: new Date(now.getTime() - 100 * 86400000),
        leaseId: 'l2', lease: { unit: { property: { name: 'C' }, label: '2' }, tenants: [{ tenant: { firstName: 'C', lastName: 'D' } }] } },
    ];
    const result = await getArrearsAgingDetail(ROUTE_CTX);
    assert.equal(result.buckets.length, 4);
    const idsToCount = Object.fromEntries(result.buckets.map((b: any) => [b.id, b.rows.length]));
    assert.equal(idsToCount['0-30'], 1);
    assert.equal(idsToCount['90+'], 1);
  });

  it('getTopOverdueDetail returns all overdue rows (no take limit)', async () => {
    db.invoice.findMany = async (args: any) => {
      assert.equal(args.take, undefined, 'no take limit');
      return Array.from({ length: 25 }, (_, i) => ({
        id: `i${i}`, totalCents: (25 - i) * 1_000_00, amountCents: (25 - i) * 1_000_00, dueDate: new Date(),
        leaseId: `l${i}`, lease: { unit: { property: { name: 'A' }, label: '1' }, tenants: [{ tenant: { firstName: 'A', lastName: 'B' } }] },
      }));
    };
    const result = await getTopOverdueDetail(ROUTE_CTX);
    assert.equal(result.rows.length, 25);
  });

  it('getLeaseExpiriesDetail returns rows grouped by 4 buckets with lease info', async () => {
    const now = new Date();
    db.lease.findMany = async () => [
      { id: 'l1', endDate: new Date(now.getTime() + 15 * 86400000), unit: { label: '1', property: { name: 'A' } }, tenants: [{ tenant: { firstName: 'A', lastName: 'B' } }] },
      { id: 'l2', endDate: new Date(now.getTime() + 200 * 86400000), unit: { label: '2', property: { name: 'C' } }, tenants: [{ tenant: { firstName: 'C', lastName: 'D' } }] },
    ];
    const result = await getLeaseExpiriesDetail(ROUTE_CTX);
    assert.equal(result.buckets.length, 4);
    const idsToCount = Object.fromEntries(result.buckets.map((b: any) => [b.id, b.rows.length]));
    assert.equal(idsToCount['0-30'], 1);
    assert.equal(idsToCount['90+'], 1);
  });

  it('getUrgentMaintenanceDetail returns all (no take limit)', async () => {
    db.maintenanceRequest.findMany = async (args: any) => {
      assert.equal(args.take, undefined, 'no take limit');
      return Array.from({ length: 12 }, (_, i) => ({
        id: `m${i}`, title: `t${i}`, priority: 'URGENT', status: 'OPEN', scheduledFor: null, createdAt: new Date(),
        unit: { label: '1', property: { name: 'A' } }, vendor: null,
      }));
    };
    const result = await getUrgentMaintenanceDetail(ROUTE_CTX);
    assert.equal(result.rows.length, 12);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement** — add 4 exported async functions in `lib/services/staff-analytics.ts`. Reuse helpers (`getPropertyIds`, `addMonths`, etc.). Each returns:

```ts
export async function getArrearsAgingDetail(ctx: RouteCtx): Promise<{
  buckets: Array<{ id: string; label: string; rows: Array<{ id: string; tenant: string; property: string; unit: string; cents: number; dueDate: Date; ageDays: number }> }>;
}> { ... }

export async function getTopOverdueDetail(ctx: RouteCtx): Promise<{
  rows: Array<{ id: string; tenant: string; property: string; unit: string; cents: number; dueDate: Date; ageDays: number }>;
}> { ... }

export async function getLeaseExpiriesDetail(ctx: RouteCtx): Promise<{
  buckets: Array<{ id: string; label: string; rows: Array<{ id: string; tenant: string | null; property: string; unit: string; endDate: Date; daysUntilExpiry: number }> }>;
}> { ... }

export async function getUrgentMaintenanceDetail(ctx: RouteCtx): Promise<{
  rows: Array<{ id: string; title: string; priority: string; status: string; property: string; unit: string; vendorName: string | null; ageDays: number; scheduledFor: Date | null }>;
}> { ... }
```

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "staff-analytics: add 4 drill-detail server functions for Phase 2b"
```

---

## Task 3: `DrillSheet` drawer shell

**Files:**
- Create: `components/analytics/drill-sheet.tsx`
- Test: `tests/components/drill-sheet.test.tsx`

The sheet is a client component that:
- Renders a fixed-position right-side drawer with a backdrop
- Closes on Esc / backdrop click → calls `onClose` (parent removes `?drill` from URL)
- Traps focus inside the drawer
- Has a header with title + close button + "Export CSV" link

- [ ] **Step 1: failing test** — assert SSR markup contains the dialog role, title prop renders, and a close button is present.

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { DrillSheet } from '@/components/analytics/drill-sheet';

describe('<DrillSheet />', () => {
  it('renders title and a close button', () => {
    const html = renderToString(
      <DrillSheet title="Arrears aging detail" csvHref="/api/analytics/drill/arrears-aging/export.csv">
        <div>content</div>
      </DrillSheet>,
    );
    assert.match(html, /Arrears aging detail/);
    assert.match(html, /Close/i);
    assert.match(html, /export\.csv/);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

type DrillSheetProps = {
  title: string;
  csvHref?: string;
  children: React.ReactNode;
};

export function DrillSheet({ title, csvHref, children }: DrillSheetProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  function close() {
    const next = new URLSearchParams(params.toString());
    next.delete('drill');
    router.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ''}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 cursor-default bg-background/60 backdrop-blur-sm"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-border bg-card shadow-xl outline-none',
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="font-serif text-[22px] font-light text-foreground">{title}</h2>
          <div className="flex items-center gap-2">
            {csvHref ? (
              <Link
                href={csvHref}
                className="border border-border bg-[color:var(--muted)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground"
              >
                Export CSV
              </Link>
            ) : null}
            <button
              type="button"
              onClick={close}
              className="border border-border bg-[color:var(--muted)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "components: add DrillSheet (URL-driven side drawer with Esc-close + CSV export link)"
```

---

## Task 4: 4 drill renderer components

**Files:**
- Create: `components/analytics/drill/arrears-aging-drill.tsx`
- Create: `components/analytics/drill/top-overdue-drill.tsx`
- Create: `components/analytics/drill/lease-expiries-drill.tsx`
- Create: `components/analytics/drill/urgent-maintenance-drill.tsx`
- Test: `tests/components/drill-renderers.test.tsx` (single file covering all 4 with renderToString smoke tests)

Each renderer is a Server Component that takes the drill payload as a prop and renders a table. Tables share a common visual idiom (uppercase mono headers, ZAR amounts right-aligned where applicable, link to source entity).

- [ ] **Step 1: failing test** (smoke renders for all 4)

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { ArrearsAgingDrill } from '@/components/analytics/drill/arrears-aging-drill';
import { TopOverdueDrill } from '@/components/analytics/drill/top-overdue-drill';
import { LeaseExpiriesDrill } from '@/components/analytics/drill/lease-expiries-drill';
import { UrgentMaintenanceDrill } from '@/components/analytics/drill/urgent-maintenance-drill';

describe('drill renderers', () => {
  it('ArrearsAgingDrill renders a table per bucket', () => {
    const html = renderToString(<ArrearsAgingDrill data={{ buckets: [
      { id: '0-30', label: '0–30 days', rows: [{ id: 'i1', tenant: 'Alice', property: 'A', unit: '1', cents: 10_000_00, dueDate: new Date(), ageDays: 5 }] },
      { id: '31-60', label: '31–60 days', rows: [] },
      { id: '61-90', label: '61–90 days', rows: [] },
      { id: '90+', label: '90+ days', rows: [] },
    ] }} />);
    assert.match(html, /0–30 days/);
    assert.match(html, /Alice/);
  });
  it('TopOverdueDrill renders an unbounded table', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, tenant: `T${i}`, property: 'A', unit: '1', cents: 1000, dueDate: new Date(), ageDays: 10 }));
    const html = renderToString(<TopOverdueDrill data={{ rows }} />);
    for (let i = 0; i < 12; i += 1) assert.match(html, new RegExp(`T${i}`));
  });
  it('LeaseExpiriesDrill renders a table per bucket', () => {
    const html = renderToString(<LeaseExpiriesDrill data={{ buckets: [
      { id: '0-30', label: '0–30 days', rows: [{ id: 'l1', tenant: 'Alice', property: 'A', unit: '1', endDate: new Date(), daysUntilExpiry: 10 }] },
      { id: '31-60', label: '31–60 days', rows: [] },
      { id: '61-90', label: '61–90 days', rows: [] },
      { id: '90+', label: '90+ days', rows: [] },
    ] }} />);
    assert.match(html, /Alice/);
  });
  it('UrgentMaintenanceDrill renders priority + age columns', () => {
    const html = renderToString(<UrgentMaintenanceDrill data={{ rows: [
      { id: 'm1', title: 'Burst geyser', priority: 'URGENT', status: 'OPEN', property: 'A', unit: '1', vendorName: null, ageDays: 2, scheduledFor: null },
    ] }} />);
    assert.match(html, /URGENT/);
    assert.match(html, /Burst geyser/);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement** — 4 components with the same table primitives. Keep each ~80 LOC. Use `formatZar` and `formatDate` from `@/lib/format`.

(Implementer: write each component as a server component that takes `data` as a prop with the exact shape returned by the matching service function from Task 2.)

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "components: add 4 drill renderer components (arrears-aging, top-overdue, lease-expiries, urgent-maintenance)"
```

---

## Task 5: Wire the drill-sheet into `app/(staff)/dashboard/layout.tsx`

**Files:**
- Modify: `app/(staff)/dashboard/layout.tsx`

The layout is currently:

```tsx
import { DashboardShell } from '@/components/analytics/dashboard-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
```

It needs to:
1. Become an async function that accepts `searchParams`
2. Read `?drill=...`
3. Validate via `drillIdSchema.safeParse`
4. If valid, load the corresponding payload via the drill server function
5. Render the matching drill renderer inside `<DrillSheet>` alongside the children

```tsx
import type { ReactNode } from 'react';

import { DashboardShell } from '@/components/analytics/dashboard-shell';
import { DrillSheet } from '@/components/analytics/drill-sheet';
import { ArrearsAgingDrill } from '@/components/analytics/drill/arrears-aging-drill';
import { TopOverdueDrill } from '@/components/analytics/drill/top-overdue-drill';
import { LeaseExpiriesDrill } from '@/components/analytics/drill/lease-expiries-drill';
import { UrgentMaintenanceDrill } from '@/components/analytics/drill/urgent-maintenance-drill';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import {
  getArrearsAgingDetail,
  getTopOverdueDetail,
  getLeaseExpiriesDetail,
  getUrgentMaintenanceDetail,
} from '@/lib/services/staff-analytics';
import { drillIdSchema, type DrillId } from '@/lib/zod/analytics-drill';

const DRILL_TITLES: Record<DrillId, string> = {
  'arrears-aging': 'Arrears aging detail',
  'top-overdue': 'All overdue accounts',
  'lease-expiries': 'Upcoming lease expiries',
  'urgent-maintenance': 'Urgent maintenance detail',
};

export default async function DashboardLayout({
  children,
  searchParams,
}: {
  children: ReactNode;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const drillRaw = Array.isArray(sp.drill) ? sp.drill[0] : sp.drill;
  const drillParse = drillRaw ? drillIdSchema.safeParse(drillRaw) : null;
  const drillId: DrillId | null = drillParse?.success ? drillParse.data : null;

  let drillNode: ReactNode = null;
  if (drillId) {
    const session = await auth();
    const ctx = userToRouteCtx(session!.user);
    const csvHref = `/api/analytics/drill/${drillId}/export.csv`;
    if (drillId === 'arrears-aging') {
      const data = await getArrearsAgingDetail(ctx);
      drillNode = <DrillSheet title={DRILL_TITLES[drillId]} csvHref={csvHref}><ArrearsAgingDrill data={data} /></DrillSheet>;
    } else if (drillId === 'top-overdue') {
      const data = await getTopOverdueDetail(ctx);
      drillNode = <DrillSheet title={DRILL_TITLES[drillId]} csvHref={csvHref}><TopOverdueDrill data={data} /></DrillSheet>;
    } else if (drillId === 'lease-expiries') {
      const data = await getLeaseExpiriesDetail(ctx);
      drillNode = <DrillSheet title={DRILL_TITLES[drillId]} csvHref={csvHref}><LeaseExpiriesDrill data={data} /></DrillSheet>;
    } else if (drillId === 'urgent-maintenance') {
      const data = await getUrgentMaintenanceDetail(ctx);
      drillNode = <DrillSheet title={DRILL_TITLES[drillId]} csvHref={csvHref}><UrgentMaintenanceDrill data={data} /></DrillSheet>;
    }
  }

  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      {drillNode}
    </>
  );
}
```

No new test for the layout (covered by the underlying component + service tests). Manual smoke verify after commit.

- [ ] **Step 1: implement**
- [ ] **Step 2: tsc + lint clean**
- [ ] **Step 3: commit**

```
git commit -m "Dashboard layout: render DrillSheet when ?drill=... is set, fetch payload, dispatch renderer"
```

---

## Task 6: Tile click links on Overview

**Files:**
- Modify: `app/(staff)/dashboard/page.tsx`

Add a "View detail →" link in the top-right of the 4 drillable tile headers (arrears aging, lease expiries, top overdue, urgent maintenance). Link sets `?drill=<id>` while preserving other URL params.

For Phase 2b simplicity, use plain `<Link>` components with hard-coded paths — the page reads the existing search params via the `searchParams` it already receives, then constructs the link href.

Inside the page (after `const sp = await searchParams; const ctx = ... ; const data = ...`):

```tsx
function drillHref(id: string) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'drill') continue;
    if (typeof v === 'string') next.set(k, v);
    else if (Array.isArray(v) && v[0] !== undefined) next.set(k, v[0]);
  }
  next.set('drill', id);
  return `?${next.toString()}`;
}
```

Then in each of the 4 tile cards, change the header from:

```tsx
<h2 className="mt-2 mb-4 ...">Arrears aging</h2>
```

to:

```tsx
<div className="mt-2 mb-4 flex items-center justify-between gap-2">
  <h2 className="font-serif text-[22px] font-light text-foreground">Arrears aging</h2>
  <Link href={drillHref('arrears-aging')} className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
    View detail →
  </Link>
</div>
```

Repeat for `top-overdue`, `lease-expiries` (the "Lease expiries" tile), `urgent-maintenance`.

- [ ] **Step 1: implement**
- [ ] **Step 2: tsc + lint clean**
- [ ] **Step 3: commit**

```
git commit -m "Dashboard Overview: add View-detail links on 4 drillable tiles"
```

---

## Task 7: CSV export endpoint

**Files:**
- Create: `app/api/analytics/drill/[tileId]/export.csv/route.ts`
- Test: `tests/api/analytics-drill-export.test.ts`

Each `tileId` returns a CSV stream with appropriate headers per drill type. Use the existing `withOrg()` HOF for auth.

- [ ] **Step 1: failing test** (mock service functions, assert response is a CSV)

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Light integration test — call the route handler directly with a fabricated request + ctx mock
// Skip if the project's existing API tests don't have this pattern; otherwise follow the convention
// in tests/services/applications.test.ts for how `db` is stubbed.

describe('drill csv export', () => {
  it('returns text/csv with a Content-Disposition for arrears-aging', async () => {
    // (skeleton — the implementer fills this in to match project test convention)
    assert.ok(true);
  });
});
```

(If the project doesn't have a clean test pattern for route handlers, the implementer can defer this test and instead manually verify the endpoint with `curl`.)

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

```ts
import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { ApiError, toErrorResponse } from '@/lib/errors';
import {
  getArrearsAgingDetail,
  getTopOverdueDetail,
  getLeaseExpiriesDetail,
  getUrgentMaintenanceDetail,
} from '@/lib/services/staff-analytics';
import { drillIdSchema } from '@/lib/zod/analytics-drill';

export const GET = withOrg(async (req, ctx, { params }: { params: Promise<{ tileId: string }> }) => {
  const { tileId } = await params;
  const parsed = drillIdSchema.safeParse(tileId);
  if (!parsed.success) return toErrorResponse(ApiError.badRequest('Unknown drill id'));

  function csv(rows: string[][]): string {
    return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  let body = '';
  let filename = `${parsed.data}.csv`;
  if (parsed.data === 'arrears-aging') {
    const data = await getArrearsAgingDetail(ctx);
    const rows: string[][] = [['Bucket', 'Tenant', 'Property', 'Unit', 'Outstanding (cents)', 'Due', 'Age (days)']];
    for (const bucket of data.buckets) {
      for (const r of bucket.rows) rows.push([bucket.label, r.tenant, r.property, r.unit, String(r.cents), r.dueDate.toISOString(), String(r.ageDays)]);
    }
    body = csv(rows);
  } else if (parsed.data === 'top-overdue') {
    const data = await getTopOverdueDetail(ctx);
    const rows: string[][] = [['Tenant', 'Property', 'Unit', 'Outstanding (cents)', 'Due', 'Age (days)']];
    for (const r of data.rows) rows.push([r.tenant, r.property, r.unit, String(r.cents), r.dueDate.toISOString(), String(r.ageDays)]);
    body = csv(rows);
  } else if (parsed.data === 'lease-expiries') {
    const data = await getLeaseExpiriesDetail(ctx);
    const rows: string[][] = [['Bucket', 'Tenant', 'Property', 'Unit', 'End date', 'Days until expiry']];
    for (const bucket of data.buckets) {
      for (const r of bucket.rows) rows.push([bucket.label, r.tenant ?? '', r.property, r.unit, r.endDate.toISOString(), String(r.daysUntilExpiry)]);
    }
    body = csv(rows);
  } else if (parsed.data === 'urgent-maintenance') {
    const data = await getUrgentMaintenanceDetail(ctx);
    const rows: string[][] = [['Title', 'Priority', 'Status', 'Property', 'Unit', 'Vendor', 'Age (days)', 'Scheduled']];
    for (const r of data.rows) rows.push([r.title, r.priority, r.status, r.property, r.unit, r.vendorName ?? '', String(r.ageDays), r.scheduledFor ? r.scheduledFor.toISOString() : '']);
    body = csv(rows);
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
```

(Verify `withOrg` signature in `lib/auth/with-org.ts` — it may or may not pass route params in this position; adapt accordingly.)

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "API: add /api/analytics/drill/[tileId]/export.csv endpoint (4 drill types)"
```

---

## Task 8: Manifest refresh

**Files:**
- Modify: `CODEBASE.md`

Add new entries:

`lib/analytics/` table:
```
| drill.ts | `DRILL_IDS`, `isDrillId(value)` — drill registry types backed by `drillIdSchema` | 12 |
```

`lib/zod/` table:
```
| analytics-drill.ts | `drillIdSchema`, `DrillId` — Zod enum of phase-2b drill ids | 10 |
```

`lib/services/staff-analytics.ts` row — append: "Phase 2b: also exports `getArrearsAgingDetail`, `getTopOverdueDetail`, `getLeaseExpiriesDetail`, `getUrgentMaintenanceDetail` (drill-detail server functions)." Update line count.

`components/analytics/` table:
```
| components/analytics/drill-sheet.tsx | `DrillSheet` — URL-driven side drawer with Esc-close + CSV export link header | 90 |
| components/analytics/drill/arrears-aging-drill.tsx | `ArrearsAgingDrill` — per-bucket grouped table for the arrears-aging drill | 80 |
| components/analytics/drill/top-overdue-drill.tsx | `TopOverdueDrill` — unbounded ranked table for the top-overdue drill | 75 |
| components/analytics/drill/lease-expiries-drill.tsx | `LeaseExpiriesDrill` — per-bucket grouped table for the lease-expiries drill | 80 |
| components/analytics/drill/urgent-maintenance-drill.tsx | `UrgentMaintenanceDrill` — full-list table with priority + age columns | 80 |
```

`app/api/` endpoint table:
```
| /api/analytics/drill/[tileId]/export.csv | GET | 4 drill-detail CSV exports |
```

`app/ — Layouts & Pages` table — update `(staff)/dashboard/layout.tsx` row to mention conditional `?drill` rendering.

- [ ] **Step 1: edit**
- [ ] **Step 2: commit**

```
git commit -m "Manifest: refresh analytics entries for Phase 2b (drill-in framework + 4 drill-ins)"
```

---

## Verification & wrap-up

```
npm test          # full suite green (~190+ tests)
npx tsc --noEmit  # clean
npm run lint      # no NEW errors
npm run build     # production build succeeds
npm run dev       # confirm:
                  #   - clicking "View detail" on arrears aging opens a drawer
                  #   - drawer shows the 4 buckets with all overdue rows
                  #   - Esc closes, backdrop click closes
                  #   - "Export CSV" downloads a CSV
                  #   - same for top-overdue, lease-expiries, urgent-maintenance
```

**Definition of done:**
1. Each of the 4 drillable tiles has a "View detail" link.
2. Clicking opens a side drawer with the full data behind that tile.
3. CSV export downloads a well-formed CSV per drill type.
4. Drawer closes via Esc / backdrop / Close button — URL `?drill` cleared in all paths.
5. All new tests pass; no regressions.
6. Manifest reflects the new shape.
