import Link from 'next/link';

import { AreaChart } from '@/components/analytics/charts/area-chart';
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
        description="Core portfolio pressure, collection health, and operations queues in one editorial view."
        actions={
          <Link
            href="/dashboard/portfolio"
            className={cn(buttonVariants({ variant: 'outline' }), 'font-mono text-[10px] uppercase tracking-[0.16em]')}
          >
            Open portfolio
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiTile kpiId="OCCUPANCY_PCT" value={data.kpis.OCCUPANCY_PCT} prior={data.priorKpis.OCCUPANCY_PCT} />
        <KpiTile kpiId="ARREARS_CENTS" value={data.kpis.ARREARS_CENTS} prior={data.priorKpis.ARREARS_CENTS} />
        <KpiTile kpiId="COLLECTION_RATE" value={data.kpis.COLLECTION_RATE} prior={data.priorKpis.COLLECTION_RATE} />
        <KpiTile kpiId="TRUST_BALANCE" value={data.kpis.TRUST_BALANCE} prior={data.priorKpis.TRUST_BALANCE} />
        <KpiTile kpiId="OPEN_MAINTENANCE" value={data.kpis.OPEN_MAINTENANCE} prior={data.priorKpis.OPEN_MAINTENANCE} />
        <KpiTile kpiId="EXPIRING_LEASES_30" value={data.kpis.EXPIRING_LEASES_30} prior={data.priorKpis.EXPIRING_LEASES_30} />
      </div>

      <StatusStrip
        items={[
          { id: 'blocked', label: 'Blocked approvals', value: String(data.kpis.BLOCKED_APPROVALS), tone: 'alert' },
          { id: 'expiring', label: 'Expiring leases', value: String(data.expiringLeases.length), tone: 'accent' },
          { id: 'current-period', label: 'Current period', value: formatDate(data.periodStart) },
        ]}
      />

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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <div className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Trend</p>
            <h2 className="mt-2 font-serif text-[30px] font-light tracking-[-0.02em] text-foreground">
              Collections trend
            </h2>
          </div>
          <AreaChart data={data.collectionsTrend} />
        </Card>
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
    </div>
  );
}
