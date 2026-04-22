type Occ = 'VACANT' | 'OCCUPIED' | 'UPCOMING' | 'CONFLICT';

const STYLES: Record<Occ, string> = {
  VACANT: 'bg-muted text-muted-foreground ring-border',
  OCCUPIED: 'bg-emerald-500/10 text-emerald-800 ring-emerald-600/20 dark:text-emerald-300',
  UPCOMING: 'bg-primary/10 text-primary ring-primary/20 dark:text-primary-foreground',
  CONFLICT: 'bg-destructive/10 text-destructive ring-destructive/25',
};

const DOTS: Record<Occ, string> = {
  VACANT: 'bg-muted-foreground/60',
  OCCUPIED: 'bg-emerald-500',
  UPCOMING: 'bg-primary',
  CONFLICT: 'bg-destructive',
};

const LABELS: Record<Occ, string> = {
  VACANT: 'Vacant',
  OCCUPIED: 'Occupied',
  UPCOMING: 'Upcoming',
  CONFLICT: 'Conflict',
};

export function OccupancyBadge({ state }: { state: Occ }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset transition-colors duration-150 ${STYLES[state]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOTS[state]}`} />
      {LABELS[state]}
    </span>
  );
}
