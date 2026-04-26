import type { ReactNode } from 'react';

import Link from 'next/link';

import { AgingBar } from '@/components/analytics/charts/aging-bar';
import { AreaChart } from '@/components/analytics/charts/area-chart';
import { BarChart } from '@/components/analytics/charts/bar-chart';
import { ComboChart } from '@/components/analytics/charts/combo-chart';
import { DonutChart } from '@/components/analytics/charts/donut-chart';
import { KpiTile } from '@/components/analytics/kpi-tile';
import { MapPanel } from '@/components/analytics/maps/map-panel';
import { MapTableToggle } from '@/components/analytics/map-table-toggle';
import { PropertyHealthRanking } from '@/components/analytics/property-health-ranking';
import { RankedList } from '@/components/analytics/ranked-list';
import { StatusStrip } from '@/components/analytics/status-strip';
import { TopOverdueTable } from '@/components/analytics/top-overdue-table';
import { DrillSheet } from '@/components/analytics/drill-sheet';
import { ArrearsAgingDrill } from '@/components/analytics/drill/arrears-aging-drill';
import { TopOverdueDrill } from '@/components/analytics/drill/top-overdue-drill';
import { LeaseExpiriesDrill } from '@/components/analytics/drill/lease-expiries-drill';
import { UrgentMaintenanceDrill } from '@/components/analytics/drill/urgent-maintenance-drill';
import { PropertyDetailDrill } from '@/components/analytics/drill/property-detail-drill';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { buttonVariants } from '@/components/ui/button';
import { formatDate, formatZar } from '@/lib/format';
import {
  getStaffCommandCenter,
  getStaffPortfolio,
  getArrearsAgingDetail,
  getTopOverdueDetail,
  getLeaseExpiriesDetail,
  getUrgentMaintenanceDetail,
  getPropertyDetailDrill,
} from '@/lib/services/staff-analytics';
import { resolveAnalyticsCtx } from '@/lib/analytics/ctx';
import { drillIdSchema, type DrillId } from '@/lib/zod/analytics-drill';
import type { RouteCtx } from '@/lib/auth/with-org';
import { cn } from '@/lib/utils';

function drillHref(id: string, sp: Record<string, string | string[] | undefined>): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'drill') continue;
    if (typeof v === 'string') next.set(k, v);
    else if (Array.isArray(v) && v[0] !== undefined) next.set(k, v[0]);
  }
  next.set('drill', id);
  return `?${next.toString()}`;
}

const DRILL_TITLES: Record<DrillId, string> = {
  'arrears-aging': 'Arrears aging detail',
  'top-overdue': 'All overdue accounts',
  'lease-expiries': 'Upcoming lease expiries',
  'urgent-maintenance': 'Urgent maintenance detail',
  'property-detail': 'Property detail',
};

async function renderDrill(drillId: DrillId, ctx: RouteCtx, propertyId?: string): Promise<ReactNode> {
  const csvHref = `/api/analytics/drill/${drillId}/export.csv`;
  const title = DRILL_TITLES[drillId];
  if (drillId === 'arrears-aging') {
    const data = await getArrearsAgingDetail(ctx);
    return (
      <DrillSheet title={title} csvHref={csvHref}>
        <ArrearsAgingDrill data={data} />
      </DrillSheet>
    );
  }
  if (drillId === 'top-overdue') {
    const data = await getTopOverdueDetail(ctx);
    return (
      <DrillSheet title={title} csvHref={csvHref}>
        <TopOverdueDrill data={data} />
      </DrillSheet>
    );
  }
  if (drillId === 'lease-expiries') {
    const data = await getLeaseExpiriesDetail(ctx);
    return (
      <DrillSheet title={title} csvHref={csvHref}>
        <LeaseExpiriesDrill data={data} />
      </DrillSheet>
    );
  }
  if (drillId === 'urgent-maintenance') {
    const data = await getUrgentMaintenanceDetail(ctx);
    return (
      <DrillSheet title={title} csvHref={csvHref}>
        <UrgentMaintenanceDrill data={data} />
      </DrillSheet>
    );
  }
  if (drillId === 'property-detail') {
    if (!propertyId) return null;
    const data = await getPropertyDetailDrill(ctx, propertyId);
    return (
      <DrillSheet title={`Property: ${data.property.name}`}>
        <PropertyDetailDrill data={data} />
      </DrillSheet>
    );
  }
  return null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const baseCtx = userToRouteCtx(session!.user);
  const sp = await searchParams;
  const analyticsCtx = resolveAnalyticsCtx(sp, baseCtx);
  const [data, portfolio] = await Promise.all([
    getStaffCommandCenter(baseCtx, {
      periodStart: analyticsCtx.range.to,
      compare: analyticsCtx.compare,
    }),
    getStaffPortfolio(baseCtx),
  ]);

  const viewRaw = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view: 'map' | 'table' = viewRaw === 'table' ? 'table' : 'map';

  // Build the shared search-param prefix once (server-side) so we can attach
  // property-detail drill URLs onto each pin without passing a function across
  // the server→client boundary.
  const sharedParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'drill' || k === 'propertyId') continue;
    if (typeof v === 'string') sharedParams.set(k, v);
    else if (Array.isArray(v) && v[0] !== undefined) sharedParams.set(k, v[0]);
  }
  const pinsWithDrillHref = data.portfolioPins.map((pin) => {
    const next = new URLSearchParams(sharedParams);
    next.set('drill', 'property-detail');
    next.set('propertyId', pin.id);
    return { ...pin, href: `?${next.toString()}` };
  });

  const drillRaw = Array.isArray(sp.drill) ? sp.drill[0] : sp.drill;
  const drillParse = drillRaw ? drillIdSchema.safeParse(drillRaw) : null;
  const drillId: DrillId | null = drillParse?.success ? drillParse.data : null;
  const propertyIdRaw = Array.isArray(sp.propertyId) ? sp.propertyId[0] : sp.propertyId;
  const drillNode: ReactNode = drillId ? await renderDrill(drillId, baseCtx, typeof propertyIdRaw === 'string' ? propertyIdRaw : undefined) : null;

  return (
    <>
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

      {/* Map hero band — 480px with Map/Table toggle */}
      <Card className="border border-border p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Portfolio</p>
            <h2 className="mt-1 font-serif text-[22px] font-light text-foreground">Map</h2>
          </div>
          <MapTableToggle current={view} />
        </div>
        <div style={{ height: 480 }} className="relative">
          {view === 'map' ? (
            <MapPanel title="" eyebrow="" pins={pinsWithDrillHref} />
          ) : (
            <PropertyHealthRanking rows={portfolio.rows} className="h-full" />
          )}
        </div>
      </Card>

      {/* 4-up cockpit grid: aging, occupancy donut, expiry buckets, maint spend */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Receivables</p>
          <div className="mt-2 mb-4 flex items-center justify-between gap-2">
            <h2 className="font-serif text-[22px] font-light text-foreground">Arrears aging</h2>
            <Link
              href={drillHref('arrears-aging', sp)}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              View detail →
            </Link>
          </div>
          <AgingBar segments={data.arrearsAging} />
        </Card>
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Portfolio</p>
          <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Occupancy</h2>
          <DonutChart
            data={[
              { x: 'Occupied', y: data.occupancyBreakdown.occupied },
              { x: 'Vacant', y: data.occupancyBreakdown.vacant },
            ]}
          />
        </Card>
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Renewals</p>
          <div className="mt-2 mb-4 flex items-center justify-between gap-2">
            <h2 className="font-serif text-[22px] font-light text-foreground">Lease expiries</h2>
            <Link
              href={drillHref('lease-expiries', sp)}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              View detail →
            </Link>
          </div>
          <BarChart data={data.leaseExpiryBuckets.map((b) => ({ x: b.label, y: b.count }))} />
        </Card>
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Operations</p>
          <h2 className="mt-2 mb-4 font-serif text-[22px] font-light text-foreground">Maintenance spend</h2>
          <AreaChart data={data.maintenanceSpendTrend} yFormat="cents" />
        </Card>
      </div>

      {/* 3-up: top overdue table + urgent maintenance + utility recovery */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Finance</p>
          <div className="mt-2 mb-4 flex items-center justify-between gap-2">
            <h2 className="font-serif text-[22px] font-light text-foreground">Top 10 overdue</h2>
            <Link
              href={drillHref('top-overdue', sp)}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              View detail →
            </Link>
          </div>
          <TopOverdueTable rows={data.topArrears} />
        </Card>
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Operations</p>
          <div className="mt-2 mb-4 flex items-center justify-between gap-2">
            <h2 className="font-serif text-[22px] font-light text-foreground">Urgent maintenance</h2>
            <Link
              href={drillHref('urgent-maintenance', sp)}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              View detail →
            </Link>
          </div>
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
    {drillNode}
    </>
  );
}
