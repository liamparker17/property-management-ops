type Status = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

const STYLES: Record<Status, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400',
  EXPIRING: 'bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300',
  EXPIRED: 'bg-destructive/10 text-destructive ring-destructive/25',
  TERMINATED: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-400',
  RENEWED: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
};

const DOTS: Record<Status, string> = {
  DRAFT: 'bg-slate-400',
  ACTIVE: 'bg-emerald-500',
  EXPIRING: 'bg-amber-500',
  EXPIRED: 'bg-destructive',
  TERMINATED: 'bg-slate-400',
  RENEWED: 'bg-violet-500',
};

const LABELS: Record<Status, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXPIRING: 'Expiring',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
  RENEWED: 'Renewed',
};

export function LeaseStatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors duration-150 ${STYLES[status]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOTS[status]}`} />
      {LABELS[status]}
    </span>
  );
}
