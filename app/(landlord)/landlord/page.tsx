import { AreaChart } from '@/components/analytics/charts/area-chart';
import { KpiTile } from '@/components/analytics/kpi-tile';
import { MapPanel } from '@/components/analytics/maps/map-panel';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { getLandlordOverview, getLandlordPortfolio } from '@/lib/services/landlord-analytics';

export const metadata = { title: 'Landlord Portfolio' };

export default async function LandlordDashboardPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const [overview, portfolio] = await Promise.all([getLandlordOverview(ctx), getLandlordPortfolio(ctx)]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Landlord Portal"
        title="Portfolio overview"
        description="Collections, disbursements, maintenance exposure, and trust visibility across your properties."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiTile kpiId="GROSS_RENT" value={overview.kpis.GROSS_RENT} prior={overview.priorKpis.GROSS_RENT} role="LANDLORD" />
        <KpiTile kpiId="DISBURSED_CENTS" value={overview.kpis.DISBURSED_CENTS} prior={overview.priorKpis.DISBURSED_CENTS} role="LANDLORD" />
        <KpiTile kpiId="MAINTENANCE_SPEND" value={overview.kpis.MAINTENANCE_SPEND} prior={overview.priorKpis.MAINTENANCE_SPEND} role="LANDLORD" />
        <KpiTile kpiId="VACANCY_DRAG" value={overview.kpis.VACANCY_DRAG} prior={overview.priorKpis.VACANCY_DRAG} role="LANDLORD" />
        <KpiTile kpiId="TRUST_BALANCE" value={overview.kpis.TRUST_BALANCE} prior={overview.priorKpis.TRUST_BALANCE} role="LANDLORD" />
        <KpiTile kpiId="OPEN_MAINTENANCE" value={overview.openMaintenance} prior={overview.priorKpis.OPEN_MAINTENANCE} role="LANDLORD" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border border-border p-5">
          <div className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Cashflow</p>
            <h2 className="mt-2 font-serif text-[28px] font-light text-foreground">Collected vs disbursed</h2>
          </div>
          <AreaChart data={overview.cashflow} />
        </Card>
        <MapPanel title="Your properties" eyebrow="Map" pins={portfolio.pins} />
      </div>
    </div>
  );
}
