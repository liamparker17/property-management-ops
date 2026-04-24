import { AreaChart } from '@/components/analytics/charts/area-chart';
import { BarChart } from '@/components/analytics/charts/bar-chart';
import { KpiTile } from '@/components/analytics/kpi-tile';
import { RankedList } from '@/components/analytics/ranked-list';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { formatZar } from '@/lib/format';
import { getStaffFinance } from '@/lib/services/staff-analytics';

export default async function StaffFinancePage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const data = await getStaffFinance(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Finance"
        description="Monthly billing, collections, trust visibility, and arrears ageing."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile kpiId="ARREARS_CENTS" value={data.kpis.ARREARS_CENTS} prior={data.priorKpis.ARREARS_CENTS} />
        <KpiTile kpiId="COLLECTION_RATE" value={data.kpis.COLLECTION_RATE} prior={data.priorKpis.COLLECTION_RATE} />
        <KpiTile kpiId="TRUST_BALANCE" value={data.kpis.TRUST_BALANCE} prior={data.priorKpis.TRUST_BALANCE} />
        <KpiTile kpiId="UNALLOCATED_CENTS" value={data.kpis.UNALLOCATED_CENTS} prior={data.priorKpis.UNALLOCATED_CENTS} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <div className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Trend</p>
            <h2 className="mt-2 font-serif text-[28px] font-light text-foreground">Billed vs collected</h2>
          </div>
          <AreaChart data={data.trend} />
        </Card>
        <Card className="border border-border p-5">
          <div className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Ageing</p>
            <h2 className="mt-2 font-serif text-[28px] font-light text-foreground">Arrears buckets</h2>
          </div>
          <BarChart data={data.arrearsBuckets} />
        </Card>
      </div>

      <RankedList
        title="Trust by landlord"
        eyebrow="Trust"
        items={data.trustBreakdown.map((row) => ({
          id: row.id,
          title: row.label,
          value: formatZar(row.y),
        }))}
        emptyCopy="No landlord trust accounts are carrying balances yet."
      />
    </div>
  );
}
