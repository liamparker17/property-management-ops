import Link from 'next/link';

import { healthBandColor } from '@/components/analytics/maps/portfolio-pins';
import type { HealthBand } from '@/components/analytics/maps/portfolio-pins';
import { formatZar } from '@/lib/format';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  name: string;
  suburb: string;
  city: string;
  province: string;
  occupiedUnits: number;
  totalUnits: number;
  occupancyPct: number;
  openMaintenance: number;
  arrearsCents: number;
  grossRentCents: number;
  healthScore: number;
  landlordName: string | null;
  agentName: string | null;
  href: string;
};

const BADGE_CLASS: Record<HealthBand, string> = {
  green: 'bg-green-500/15 text-green-700 dark:text-green-300',
  gold: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  orange: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  red: 'bg-red-500/15 text-red-700 dark:text-red-300',
  neutral: 'bg-muted text-muted-foreground',
};

export function PropertyHealthRanking({ rows, className }: { rows: Row[]; className?: string }) {
  if (rows.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-muted-foreground', className)}>
        No properties to rank.
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => b.healthScore - a.healthScore);

  return (
    <div className={cn('overflow-auto', className)}>
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--muted)]/40 text-left">
          <tr>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Property</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Location</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-right">Occupancy</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-right">Open maint</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-right">Arrears</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-center">Health</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-right">Gross rent</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const band = healthBandColor(row.healthScore);
            return (
              <tr key={row.id} className="border-t border-border/60">
                <td className="px-4 py-2">
                  <Link href={row.href} className="font-medium text-foreground underline-offset-2 hover:underline">
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {[row.suburb, row.city].filter(Boolean).join(', ')}
                </td>
                <td className="px-4 py-2 text-foreground text-right tabular-nums">{row.occupancyPct}%</td>
                <td className="px-4 py-2 text-foreground text-right tabular-nums">{row.openMaintenance}</td>
                <td className="px-4 py-2 text-foreground text-right tabular-nums">{formatZar(row.arrearsCents)}</td>
                <td className="px-4 py-2 text-center">
                  <span className={cn('inline-block rounded-sm px-2 py-0.5 text-xs font-medium tabular-nums', BADGE_CLASS[band])}>
                    {row.healthScore}
                  </span>
                </td>
                <td className="px-4 py-2 text-foreground text-right tabular-nums">{formatZar(row.grossRentCents)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
