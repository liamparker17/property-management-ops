import { getSeriesPalette } from '@/lib/analytics/chart-theme';
import { formatZar } from '@/lib/format';
import { cn } from '@/lib/utils';

export type AgingSegment = {
  id: string;
  label: string;
  cents: number;
};

type AgingBarProps = {
  segments: AgingSegment[];
  className?: string;
};

export function AgingBar({ segments, className }: AgingBarProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.cents), 0);
  if (total === 0) {
    return (
      <div className={cn('flex items-center justify-center py-8 text-sm text-muted-foreground', className)}>
        No arrears outstanding
      </div>
    );
  }
  const palette = getSeriesPalette(segments.length);
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-6 w-full overflow-hidden rounded-sm border border-border">
        {segments.map((segment, i) => {
          const pct = total > 0 ? (Math.max(0, segment.cents) / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={segment.id}
              title={`${segment.label}: ${formatZar(segment.cents)}`}
              style={{ width: `${pct}%`, background: palette[i] }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {segments.map((segment, i) => (
          <div key={segment.id} className="flex items-center gap-2">
            <span aria-hidden className="inline-block size-2 rounded-sm" style={{ background: palette[i] }} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{segment.label}</div>
              <div className="font-medium text-foreground">{formatZar(segment.cents)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
