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
      <p className="mt-3 font-serif text-[26px] md:text-[30px] xl:text-[32px] 2xl:text-[34px] leading-none tracking-[-0.02em] text-foreground tabular-nums">
        {displayValue}
      </p>
      {delta ? (
        <span className="mt-2 inline-block border border-border bg-[color:var(--muted)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {delta}
        </span>
      ) : null}
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
