type Status = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

const STYLES: Record<Status, string> = {
  DRAFT: 'bg-muted text-muted-foreground ring-border',
  ACTIVE: 'bg-emerald-500/10 text-emerald-800 ring-emerald-600/20 dark:text-emerald-300',
  EXPIRING: 'bg-[color:var(--accent)]/10 text-foreground ring-[color:var(--accent)]/30',
  EXPIRED: 'bg-destructive/10 text-destructive ring-destructive/25',
  TERMINATED: 'bg-secondary text-secondary-foreground ring-border',
  RENEWED: 'bg-primary/10 text-primary ring-primary/20 dark:text-primary-foreground',
};

const DOTS: Record<Status, string> = {
  DRAFT: 'bg-muted-foreground/60',
  ACTIVE: 'bg-emerald-500',
  EXPIRING: 'bg-[color:var(--accent)]',
  EXPIRED: 'bg-destructive',
  TERMINATED: 'bg-secondary-foreground/55',
  RENEWED: 'bg-primary',
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset transition-colors duration-150 ${STYLES[status]}`}
    >
      <span className={`h-2 w-2 rounded-full ${DOTS[status]}`} />
      {LABELS[status]}
    </span>
  );
}
