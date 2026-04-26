# Dashboard Analytics — Phase 3 Implementation Plan (Map hero band)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Promote the portfolio map from a small bottom-grid card into a **480px-tall hero band** between the ComboChart and the 4-up cockpit grid. Pins are colored by the composite `healthScore` (green ≥80 / gold 60–80 / orange 40–60 / red <40). A `Map · Table` toggle in the top-right flips between the map and a sortable Property Health Ranking table over the same dataset. Clicking a pin opens a side drawer (reuses Phase 2b `DrillSheet`) with that property's KPIs + "Open property" link.

**Architecture:** Extend Phase 2a's `healthScore` from the Properties tab to the Overview's `portfolioPins`. Add a new drill id `property-detail` keyed on a property id (`?drill=property-detail&propertyId=<id>`). Add a `MapTableToggle` client component that swaps view via URL param `?view=map|table` (default `map`). Reuse `DrillSheet` for the pin click sheet — Phase 2b's framework supports this with no changes.

**Existing context (post-master):**
- `getStaffCommandCenter` returns `portfolioPins: PortfolioPin[]` (already coordinates + name + meta) — gap is the healthScore field.
- `getStaffPortfolio` returns `rows` with `healthScore`. We need to thread healthScore into the Overview's `portfolioPins` too.
- `MapPanel` + `PortfolioPins` (react-leaflet) already render markers; we extend them with color bands.
- `DrillSheet` accepts arbitrary `?drill=<id>` payloads. We add `property-detail` to the registry and render a property-summary card.

**Tech stack:** Same as before. No new deps.

---

## File Map

**Create:**
- `components/analytics/maps/property-detail-drill.tsx` — server-component renderer for the pin-click drawer
- `components/analytics/map-table-toggle.tsx` — client toggle (URL `?view=`)
- `components/analytics/property-health-ranking.tsx` — sortable table with health badge column
- Tests for each new component + the new drill server function

**Modify:**
- `lib/services/staff-analytics.ts` — `portfolioPins` type adds `healthScore: number | null`; new `getPropertyDetailDrill(ctx, propertyId)` server function
- `lib/zod/analytics-drill.ts` — add `'property-detail'` to the enum
- `components/analytics/maps/portfolio-pins.tsx` — accept `healthScore` per pin, color the leaflet `divIcon` accordingly
- `components/analytics/maps/map-panel.tsx` — surface a click handler so the layer can route to `?drill=property-detail&propertyId=<id>`
- `app/(staff)/dashboard/page.tsx` — promote the map to a 480px hero band; wrap in `<MapTableToggle>`; the table view renders `<PropertyHealthRanking>`. Remove the map from the bottom 3-up grid; that grid becomes 2-up (open-maintenance ranked list + ?... actually just a single-column row).
- `app/(staff)/dashboard/layout.tsx` — extend the drill dispatch to handle `property-detail` (read `?propertyId=`, fetch via `getPropertyDetailDrill`, render `<PropertyDetailDrill>`).
- `CODEBASE.md`

---

## Task 1: Add `healthScore` to `PortfolioPin` + service

**Files:**
- Modify: `components/analytics/maps/portfolio-pins.tsx`
- Modify: `lib/services/staff-analytics.ts`
- Test: append to `tests/services/staff-analytics-hero.test.ts`

- [ ] **Step 1: failing test**

```ts
describe('getStaffCommandCenter — portfolioPins.healthScore', () => {
  it('attaches healthScore to each pin from the corresponding property snapshot', async () => {
    db.property.findMany = async () => [
      { id: 'p1', name: 'Tower A', addressLine1: '', suburb: 's', city: 'Johannesburg', province: 'GP', latitude: -26.2, longitude: 28.0, landlord: null, assignedAgent: null },
    ];
    db.propertyMonthlySnapshot.findMany = async () => [
      { orgId: ORG_ID, propertyId: 'p1', periodStart: new Date(), occupiedUnits: 9, totalUnits: 10, openMaintenance: 0, arrearsCents: 0, grossRentCents: 100_000_00 },
    ];
    const result = await getStaffCommandCenter(ROUTE_CTX);
    const pin = result.portfolioPins.find((p: any) => p.id === 'p1');
    assert.ok(pin, 'pin exists');
    assert.equal(typeof pin.healthScore, 'number', 'healthScore is set');
    assert.ok(pin.healthScore >= 0 && pin.healthScore <= 90);
  });

  it('healthScore is null when no snapshot exists for a property', async () => {
    db.property.findMany = async () => [
      { id: 'p2', name: 'No Snapshot', addressLine1: '', suburb: '', city: 'Johannesburg', province: 'GP', latitude: -26.2, longitude: 28.0, landlord: null, assignedAgent: null },
    ];
    db.propertyMonthlySnapshot.findMany = async () => [];
    const result = await getStaffCommandCenter(ROUTE_CTX);
    const pin = result.portfolioPins.find((p: any) => p.id === 'p2');
    assert.equal(pin?.healthScore, null);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

3a. Update `PortfolioPin` type in `components/analytics/maps/portfolio-pins.tsx`:
```ts
export type PortfolioPin = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  href?: string;
  meta?: string;
  healthScore?: number | null;
};
```

3b. In `lib/services/staff-analytics.ts`, inside `getStaffCommandCenter`:
- Pull current-period property snapshots for the same scope already used by `getScopedProperties`/`buildPropertyPin`.
- Build a `Map<propertyId, healthScore>` using the existing `computeHealthScore` helper from Phase 2a.
- Pass the map into `buildPropertyPin` (extend its signature) so each pin returns `healthScore: scoreMap.get(property.id) ?? null`.

(Reuse — do not duplicate — the existing `computeHealthScore` helper.)

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "staff-analytics: thread healthScore onto portfolioPins for map coloring"
```

---

## Task 2: Color leaflet pins by health band

**Files:**
- Modify: `components/analytics/maps/portfolio-pins.tsx`
- Test: `tests/components/portfolio-pins.test.tsx` (create — small SSR-safe assertion)

- [ ] **Step 1: failing test**

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { healthBandColor } from '@/components/analytics/maps/portfolio-pins';

describe('healthBandColor', () => {
  it('returns green for score >= 80', () => {
    assert.equal(healthBandColor(85), 'green');
    assert.equal(healthBandColor(80), 'green');
  });
  it('returns gold for 60..79', () => {
    assert.equal(healthBandColor(75), 'gold');
    assert.equal(healthBandColor(60), 'gold');
  });
  it('returns orange for 40..59', () => {
    assert.equal(healthBandColor(50), 'orange');
    assert.equal(healthBandColor(40), 'orange');
  });
  it('returns red for < 40', () => {
    assert.equal(healthBandColor(39), 'red');
    assert.equal(healthBandColor(0), 'red');
  });
  it('returns neutral for null / undefined', () => {
    assert.equal(healthBandColor(null), 'neutral');
    assert.equal(healthBandColor(undefined), 'neutral');
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

3a. Export `healthBandColor` (pure helper) at the top of `portfolio-pins.tsx`:
```ts
export type HealthBand = 'green' | 'gold' | 'orange' | 'red' | 'neutral';

export function healthBandColor(score: number | null | undefined): HealthBand {
  if (score === null || score === undefined) return 'neutral';
  if (score >= 80) return 'green';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'orange';
  return 'red';
}

const BAND_HEX: Record<HealthBand, string> = {
  green: '#2f9461',
  gold: '#c9a44c',
  orange: '#d68a3e',
  red: '#c45a4f',
  neutral: '#5c6680',
};
```

3b. Update the existing `divIcon` factory to use `BAND_HEX[healthBandColor(pin.healthScore)]` for fill color.

3c. The on-map click handler should set `?drill=property-detail&propertyId=<pin.id>` (preserving other params, similar to `drillHref` on the dashboard page). For Phase 3 simplicity, wrap each marker in a `<Marker>` with `eventHandlers={{ click: () => navigate(...) }}` using `useRouter` from `next/navigation`.

(If `useRouter` inside react-leaflet markers turns out hairy, fallback: render the marker's popup with a `<Link>` to the drill URL.)

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "components: color portfolio map pins by composite health band (green/gold/orange/red)"
```

---

## Task 3: `MapTableToggle` component

**Files:**
- Create: `components/analytics/map-table-toggle.tsx`
- Test: `tests/components/map-table-toggle.test.tsx`

- [ ] **Step 1: failing test**

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { MapTableToggle } from '@/components/analytics/map-table-toggle';

describe('<MapTableToggle />', () => {
  it('renders both buttons with the active one styled', () => {
    const html = renderToString(<MapTableToggle current="map" />);
    assert.match(html, /Map/);
    assert.match(html, /Table/);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement**

```tsx
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { cn } from '@/lib/utils';

type MapTableToggleProps = {
  current: 'map' | 'table';
};

export function MapTableToggle({ current }: MapTableToggleProps) {
  let router: ReturnType<typeof useRouter> | null = null;
  try { router = useRouter(); } catch { router = null; }
  let pathname: string = '/';
  try { pathname = usePathname() ?? '/'; } catch { pathname = '/'; }
  let params: URLSearchParams | null = null;
  try { params = new URLSearchParams(useSearchParams()?.toString() ?? ''); } catch { params = null; }
  const [, startTransition] = useTransition();

  function setView(view: 'map' | 'table') {
    if (!router || !params) return;
    const next = new URLSearchParams(params.toString());
    if (view === 'map') next.delete('view');
    else next.set('view', view);
    startTransition(() => router!.replace(`${pathname}${next.toString() ? `?${next.toString()}` : ''}`));
  }

  return (
    <div className="inline-flex border border-border">
      {(['map', 'table'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={cn(
            'px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em]',
            current === v ? 'bg-[color:var(--muted)] text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {v === 'map' ? 'Map' : 'Table'}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "components: add MapTableToggle (URL ?view=map|table flipper)"
```

---

## Task 4: `PropertyHealthRanking` table

**Files:**
- Create: `components/analytics/property-health-ranking.tsx`
- Test: `tests/components/property-health-ranking.test.tsx`

This component renders a sortable table (default sort: healthScore desc) over `PropertyAnalyticsRow[]` with columns: Property, Suburb/City, Occupancy %, Open maintenance, Arrears, Health badge (color-coded), Gross rent. Reuses the same color-band logic.

- [ ] **Step 1: failing test** (renderToString smoke + sorting assertion via fixture)

```tsx
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { PropertyHealthRanking } from '@/components/analytics/property-health-ranking';

const rows = [
  { id: 'a', name: 'Alpha', suburb: 'S', city: 'Johannesburg', province: 'GP', occupiedUnits: 9, totalUnits: 10, occupancyPct: 90, openMaintenance: 0, arrearsCents: 0, grossRentCents: 100_000_00, healthScore: 85, landlordName: null, agentName: null, href: '/properties/a' },
  { id: 'b', name: 'Beta', suburb: 'S', city: 'Johannesburg', province: 'GP', occupiedUnits: 4, totalUnits: 10, occupancyPct: 40, openMaintenance: 3, arrearsCents: 50_000_00, grossRentCents: 100_000_00, healthScore: 35, landlordName: null, agentName: null, href: '/properties/b' },
];

describe('<PropertyHealthRanking />', () => {
  it('renders rows sorted by healthScore desc by default', () => {
    const html = renderToString(<PropertyHealthRanking rows={rows} />);
    const alphaIdx = html.indexOf('Alpha');
    const betaIdx = html.indexOf('Beta');
    assert.ok(alphaIdx > 0 && betaIdx > 0 && alphaIdx < betaIdx);
  });
  it('renders empty-state when rows is empty', () => {
    const html = renderToString(<PropertyHealthRanking rows={[]} />);
    assert.match(html, /No properties/i);
  });
});
```

- [ ] **Step 2: fail**
- [ ] **Step 3: implement** (~80 LOC server component table; use `healthBandColor` from `portfolio-pins.tsx` for the badge background tint).

- [ ] **Step 4: green**
- [ ] **Step 5: commit**

```
git commit -m "components: add PropertyHealthRanking sortable table with health badges"
```

---

## Task 5: Property-detail drill (server function + drill renderer + registry entry)

**Files:**
- Modify: `lib/zod/analytics-drill.ts` (add `'property-detail'` to the enum)
- Modify: `lib/services/staff-analytics.ts` (add `getPropertyDetailDrill(ctx, propertyId)`)
- Create: `components/analytics/drill/property-detail-drill.tsx`
- Test: append to `tests/services/staff-analytics-drill.test.ts`
- Test: append to `tests/components/drill-renderers.test.tsx`

Service shape:
```ts
export async function getPropertyDetailDrill(ctx: RouteCtx, propertyId: string): Promise<{
  property: { id: string; name: string; suburb: string | null; city: string | null; province: string };
  kpis: { occupancyPct: number; openMaintenance: number; arrearsCents: number; grossRentCents: number; healthScore: number | null };
  recentExpiringLeases: Array<{ id: string; tenant: string | null; unit: string; endDate: Date; daysUntilExpiry: number }>;
  recentMaintenance: Array<{ id: string; title: string; priority: string; status: string }>;
}>
```

Drill renderer renders 4 KPI cards + 2 short tables + a "Open property" link to `/properties/{id}`.

- [ ] **Step 1: failing test (service)**
- [ ] **Step 2: fail**
- [ ] **Step 3: implement service**
- [ ] **Step 4: failing test (renderer)**
- [ ] **Step 5: fail**
- [ ] **Step 6: implement renderer**
- [ ] **Step 7: green for both**
- [ ] **Step 8: commit**

```
git commit -m "Phase 3: add property-detail drill (service + renderer + drill-id enum entry)"
```

---

## Task 6: Wire into Overview page + dashboard layout

**Files:**
- Modify: `app/(staff)/dashboard/page.tsx`
- Modify: `app/(staff)/dashboard/layout.tsx`

### 6a. Page — promote map to a hero band

Read the page first. The current structure (post-Phase-2a) has a 3-up grid `[1.4fr_1fr]` containing `MapPanel` + Open-maintenance `RankedList`. Move the `MapPanel` into a new full-width hero band between the ComboChart card and the 4-up cockpit grid:

```tsx
{/* MAP HERO BAND (Phase 3) */}
<Card className="border border-border p-0 overflow-hidden">
  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Portfolio</p>
      <h2 className="mt-1 font-serif text-[22px] font-light text-foreground">Map</h2>
    </div>
    <MapTableToggle current={view} />
  </div>
  <div style={{ height: 480 }}>
    {view === 'map' ? (
      <MapPanel pins={data.portfolioPins} title="" eyebrow="" />
    ) : (
      <PropertyHealthRanking rows={portfolioRows} />
    )}
  </div>
</Card>
```

Where `view = sp.view === 'table' ? 'table' : 'map'` (default map). And `portfolioRows = await getStaffPortfolio(baseCtx).then(r => r.rows)` — fetched in parallel with `getStaffCommandCenter` via `Promise.all`.

The bottom 3-up grid loses the `MapPanel`. Make it a single-row of one card (Open maintenance) or remove it and keep just the Maintenance-by-status card below. Reasonable Phase 3 layout: drop the bottom 3-up grid, keep the single Maintenance-by-status card.

### 6b. Layout — handle `property-detail` drill

Add to the existing drill dispatch in `app/(staff)/dashboard/layout.tsx`:

```ts
} else if (drillId === 'property-detail') {
  const propertyIdRaw = Array.isArray(sp.propertyId) ? sp.propertyId[0] : sp.propertyId;
  if (typeof propertyIdRaw === 'string' && propertyIdRaw.length > 0) {
    const data = await getPropertyDetailDrill(ctx, propertyIdRaw);
    drillNode = (
      <DrillSheet title={`Property: ${data.property.name}`}>
        <PropertyDetailDrill data={data} />
      </DrillSheet>
    );
  }
}
```

(No CSV export for property-detail — drop the `csvHref`.)

### Verify + commit

```
npx tsc --noEmit
npm run lint
npm test
git add "app/(staff)/dashboard/page.tsx" "app/(staff)/dashboard/layout.tsx"
git commit -m "Dashboard Overview: promote map to 480px hero band with Map/Table toggle and pin-click drill"
```

---

## Task 7: Manifest refresh

**Files:**
- Modify: `CODEBASE.md`

Update entries for:
- `lib/services/staff-analytics.ts` — note `getPropertyDetailDrill`, `portfolioPins.healthScore`
- `lib/zod/analytics-drill.ts` — note 5 ids now (added `property-detail`)
- `components/analytics/maps/portfolio-pins.tsx` — note `healthBandColor`
- New components: `map-table-toggle.tsx`, `property-health-ranking.tsx`, `drill/property-detail-drill.tsx`
- `/dashboard` route description — mention map hero band + Map/Table toggle

```
git commit -m "Manifest: refresh analytics entries for Phase 3 (map hero band, Map/Table toggle, property-detail drill)"
```

---

## Verification & wrap-up

```
npm test          # full suite green
npx tsc --noEmit  # clean
npm run lint      # no NEW errors
npm run build     # production build succeeds
npm run dev       # confirm:
                  #   - Overview shows a 480px tall map hero band between the combo chart and the 4-up grid
                  #   - Pins are colored green/gold/orange/red by health
                  #   - Clicking a pin opens a side drawer with property KPIs + Open property link
                  #   - Map/Table toggle in the band header flips to a sortable Property Health Ranking table over the same dataset
                  #   - URL ?view=table persists across reloads; default is map
```

**Definition of done:**
1. Map hero band lives on the Overview at the right vertical position.
2. Pins colored by composite health band.
3. Map ⇄ Table toggle flips views via URL param.
4. Pin click opens DrillSheet with property KPI summary + "Open property" link.
5. Tests green; manifest current; no regressions.
