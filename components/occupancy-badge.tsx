type Occ = 'VACANT' | 'OCCUPIED' | 'UPCOMING' | 'CONFLICT';

const STYLES: Record<Occ, string> = {
  VACANT: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
  OCCUPIED: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400',
  UPCOMING: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
  CONFLICT: 'bg-destructive/10 text-destructive ring-destructive/25',
};

const DOTS: Record<Occ, string> = {
  VACANT: 'bg-slate-400',
  OCCUPIED: 'bg-emerald-500',
  UPCOMING: 'bg-violet-500',
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors duration-150 ${STYLES[state]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOTS[state]}`} />
      {LABELS[state]}
    </span>
  );
}
