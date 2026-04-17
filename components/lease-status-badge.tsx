type Status = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

const STYLES: Record<Status, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  EXPIRING: 'bg-amber-50 text-amber-800 ring-amber-200',
  EXPIRED: 'bg-red-50 text-red-700 ring-red-200',
  TERMINATED: 'bg-slate-100 text-slate-600 ring-slate-200',
  RENEWED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
};

const DOTS: Record<Status, string> = {
  DRAFT: 'bg-slate-400',
  ACTIVE: 'bg-emerald-500',
  EXPIRING: 'bg-amber-500',
  EXPIRED: 'bg-red-500',
  TERMINATED: 'bg-slate-400',
  RENEWED: 'bg-indigo-500',
};

export function LeaseStatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOTS[status]}`} />
      {status}
    </span>
  );
}
