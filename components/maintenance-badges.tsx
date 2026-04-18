import { AlertTriangle, CircleDot, Loader2, CheckCircle2, Archive } from 'lucide-react';
import type { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

const STATUS_STYLE: Record<MaintenanceStatus, { ring: string; dot: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  OPEN:        { ring: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',         dot: 'bg-amber-500',    icon: CircleDot,    label: 'Open' },
  IN_PROGRESS: { ring: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',     dot: 'bg-violet-500',   icon: Loader2,      label: 'In progress' },
  RESOLVED:    { ring: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400', dot: 'bg-emerald-500',  icon: CheckCircle2, label: 'Resolved' },
  CLOSED:      { ring: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-400',         dot: 'bg-slate-400',    icon: Archive,      label: 'Closed' },
};

const PRIORITY_STYLE: Record<MaintenancePriority, { ring: string; label: string }> = {
  LOW:    { ring: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300',         label: 'Low' },
  MEDIUM: { ring: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300',                 label: 'Medium' },
  HIGH:   { ring: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',         label: 'High' },
  URGENT: { ring: 'bg-destructive/10 text-destructive ring-destructive/25',                       label: 'Urgent' },
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors duration-150 ${s.ring}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function MaintenancePriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const s = PRIORITY_STYLE[priority];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors duration-150 ${s.ring}`}>
      {priority === 'URGENT' && <AlertTriangle className="mr-1 h-3 w-3" />}
      {s.label}
    </span>
  );
}
