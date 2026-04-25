import Link from 'next/link';

import { chartTheme } from '@/lib/analytics/chart-theme';
import { formatZar } from '@/lib/format';
import { cn } from '@/lib/utils';

export type TopOverdueRow = {
  id: string;
  title: string;
  subtitle: string;
  amountCents: number;
  fraction: number;
  href: string;
};

export function TopOverdueTable({ rows, className }: { rows: TopOverdueRow[]; className?: string }) {
  if (rows.length === 0) {
    return <div className={cn('py-6 text-center text-sm text-muted-foreground', className)}>No overdue accounts.</div>;
  }
  return (
    <div className={cn('overflow-hidden border border-border', className)}>
      <table className="min-w-full text-sm">
        <thead className="bg-[color:var(--muted)]/40 text-left">
          <tr>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lease</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tenant</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Outstanding</th>
            <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Relative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const widthPct = Math.max(0, Math.min(1, row.fraction)) * 100;
            return (
              <tr key={row.id} className="border-t border-border/60">
                <td className="px-4 py-2"><Link href={row.href} className="text-foreground underline-offset-2 hover:underline">{row.title}</Link></td>
                <td className="px-4 py-2 text-muted-foreground">{row.subtitle}</td>
                <td className="px-4 py-2 text-foreground">{formatZar(row.amountCents)}</td>
                <td className="px-4 py-2">
                  <div className="h-2 w-32 overflow-hidden rounded-sm border border-border">
                    <div style={{ width: `${widthPct}%`, height: '100%', background: chartTheme.seriesA }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
