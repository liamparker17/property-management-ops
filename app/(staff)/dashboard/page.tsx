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
