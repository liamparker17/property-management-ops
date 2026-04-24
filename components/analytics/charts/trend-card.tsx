'use client';

import { AreaChart, type ChartPoint } from '@/components/analytics/charts/area-chart';
import { KpiTile } from '@/components/analytics/kpi-tile';
import { KPIS, type KpiId } from '@/lib/analytics/kpis';
import { cn } from '@/lib/utils';

type TrendCardProps = {
  kpiId: KpiId;
  value: number;
  prior?: number | null;
  data: ChartPoint[];
  href?: string;
  className?: string;
};

export function TrendCard({
  kpiId,
  value,
  prior,
  data,
  href,
  className,
}: TrendCardProps) {
  return (
    <section className={cn('border border-border bg-card', className)}>
      <KpiTile kpiId={kpiId} value={value} prior={prior} href={href} className="border-0 shadow-none" />
      <div className="border-t border-border/70 px-2 pb-3">
        <AreaChart
          data={data}
          height={180}
          yFormat={KPIS[kpiId].format === 'CENTS' ? 'cents' : 'count'}
        />
      </div>
    </section>
  );
}
