type Occ = 'VACANT' | 'OCCUPIED' | 'UPCOMING' | 'CONFLICT';

const STYLES: Record<Occ, string> = {
  VACANT: 'bg-slate-100 text-slate-700 ring-slate-200',
  OCCUPIED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  UPCOMING: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  CONFLICT: 'bg-red-50 text-red-700 ring-red-200',
};

const DOTS: Record<Occ, string> = {
  VACANT: 'bg-slate-400',
  OCCUPIED: 'bg-emerald-500',
  UPCOMING: 'bg-indigo-500',
  CONFLICT: 'bg-red-500',
};

export function OccupancyBadge({ state }: { state: Occ }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[state]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[state]}`} />
      {state}
    </span>
  );
}
