import { AreaChart } from '@/components/analytics/charts/area-chart';
import { RankedList } from '@/components/analytics/ranked-list';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { formatZar } from '@/lib/format';
import { getLandlordCashflow, getLandlordMaintenanceExposure, getLandlordYield } from '@/lib/services/landlord-analytics';

export default async function LandlordReportsPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const [cashflow, yieldRows, maintenance] = await Promise.all([
    getLandlordCashflow(ctx),
    getLandlordYield(ctx),
    getLandlordMaintenanceExposure(ctx),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Landlord Portal" title="Reports" description="Cashflow, yield, and maintenance exposure in one report view." />
      <Card className="border border-border p-5">
        <div className="mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Cashflow</p>
          <h2 className="mt-2 font-serif text-[28px] font-light text-foreground">Monthly series</h2>
        </div>
        <AreaChart data={cashflow.cashflow} />
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <RankedList
          title="Yield placeholders"
          eyebrow="Yield"
          items={yieldRows.map((row) => ({
            id: row.propertyId,
            title: row.propertyName,
            subtitle: row.valuationMissing ? 'Awaiting valuation data' : 'Yield available',
            value: formatZar(row.annualisedCollectedCents),
          }))}
        />
        <RankedList
          title="Top vendors"
          eyebrow="Maintenance"
          items={maintenance.vendorLeaderboard.map((row) => ({
            id: row.id,
            title: row.label,
            value: formatZar(row.value),
          }))}
          emptyCopy="No vendor-spend history captured yet."
        />
      </div>
    </div>
  );
}
