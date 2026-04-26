'use client';

import type { Role } from '@prisma/client';
import Link from 'next/link';

import { Sparkline } from '@/components/analytics/sparkline';
import { formatZarShort } from '@/lib/format';
import { formatKpi } from '@/lib/analytics/formatters';
import { resolveDrillTarget } from '@/lib/analytics/drill-targets';
import { getKpi, type KpiId } from '@/lib/analytics/kpis';
import { cn } from '@/lib/utils';

type KpiTileProps = {
  kpiId: KpiId;
  value: number;
  prior?: number | null;
  series?: number[];
  href?: string;
  role?: Role;
  className?: string;
};

function formatDelta(current: number, prior?: number | null) {
  if (prior === undefined || prior === null || prior === 0) return null;
  const delta = ((current - prior) / Math.abs(prior)) * 100;
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${Math.round(delta)}%`;
}

export function KpiTile({
  kpiId,
  value,
  prior,
  series,
  href,
  role = 'ADMIN',
  className,
}: KpiTileProps) {
  const kpi = getKpi(kpiId);
  const target = href ?? resolveDrillTarget(kpiId, role);
  const delta = formatDelta(value, prior);
  const displayValue = kpi.format === 'CENTS' ? formatZarShort(value) : formatKpi(value, kpi.format);

  return (
    <Link
      href={target}
      className={cn(
        'group block border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]/60 hover:shadow-card',
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--accent)]">
        {kpi.eyebrow}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">{kpi.label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-serif text-[28px] md:text-[32px] xl:text-[36px] 2xl:text-[40px] leading-none tracking-[-0.03em] text-foreground truncate">
          {displayValue}
        </p>
        {delta ? (
          <span className="border border-border bg-[color:var(--muted)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {delta}
          </span>
        ) : null}
      </div>
      {series && series.length > 0 ? (
        <div className="mt-4">
          <Sparkline series={series} width={140} height={28} />
        </div>
      ) : null}
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        View detail
      </p>
    </Link>
  );
}
