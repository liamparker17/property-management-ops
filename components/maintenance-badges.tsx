import { AlertTriangle, CircleDot, Loader2, CheckCircle2, Archive } from 'lucide-react';
import type { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

const STATUS_STYLE: Record<MaintenanceStatus, { ring: string; dot: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  OPEN:        { ring: 'bg-[color:var(--accent)]/10 text-foreground ring-[color:var(--accent)]/30',     dot: 'bg-[color:var(--accent)]', icon: CircleDot,    label: 'Open' },
  IN_PROGRESS: { ring: 'bg-primary/10 text-primary ring-primary/20 dark:text-primary-foreground',       dot: 'bg-primary',                icon: Loader2,      label: 'In progress' },
  RESOLVED:    { ring: 'bg-emerald-500/10 text-emerald-800 ring-emerald-600/20 dark:text-emerald-300', dot: 'bg-emerald-500',          icon: CheckCircle2, label: 'Resolved' },
  CLOSED:      { ring: 'bg-muted text-muted-foreground ring-border',                                     dot: 'bg-muted-foreground/60',   icon: Archive,      label: 'Closed' },
};

const PRIORITY_STYLE: Record<MaintenancePriority, { ring: string; label: string }> = {
  LOW:    { ring: 'bg-muted text-muted-foreground ring-border',                                   label: 'Low' },
  MEDIUM: { ring: 'bg-primary/10 text-primary ring-primary/20 dark:text-primary-foreground',     label: 'Medium' },
  HIGH:   { ring: 'bg-[color:var(--accent)]/10 text-foreground ring-[color:var(--accent)]/30',   label: 'High' },
  URGENT: { ring: 'bg-destructive/10 text-destructive ring-destructive/25',                       label: 'Urgent' },
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset transition-colors duration-150 ${s.ring}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function MaintenancePriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const s = PRIORITY_STYLE[priority];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset transition-colors duration-150 ${s.ring}`}>
      {priority === 'URGENT' && <AlertTriangle className="mr-1 h-3 w-3" />}
      {s.label}
    </span>
  );
}
