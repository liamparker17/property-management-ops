import { AlertTriangle, CircleDot, Loader2, CheckCircle2, Archive } from 'lucide-react';
import type { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

const STATUS_STYLE: Record<MaintenanceStatus, { bg: string; text: string; ring: string; dot: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  OPEN:        { bg: 'bg-amber-50',    text: 'text-amber-700',    ring: 'ring-amber-200',    dot: 'bg-amber-500',    icon: CircleDot,    label: 'Open' },
  IN_PROGRESS: { bg: 'bg-indigo-50',   text: 'text-indigo-700',   ring: 'ring-indigo-200',   dot: 'bg-indigo-500',   icon: Loader2,      label: 'In progress' },
  RESOLVED:    { bg: 'bg-emerald-50',  text: 'text-emerald-700',  ring: 'ring-emerald-200',  dot: 'bg-emerald-500',  icon: CheckCircle2, label: 'Resolved' },
  CLOSED:      { bg: 'bg-slate-100',   text: 'text-slate-600',    ring: 'ring-slate-200',    dot: 'bg-slate-400',    icon: Archive,      label: 'Closed' },
};

const PRIORITY_STYLE: Record<MaintenancePriority, { bg: string; text: string; ring: string; label: string }> = {
  LOW:    { bg: 'bg-slate-100',  text: 'text-slate-600',  ring: 'ring-slate-200',  label: 'Low' },
  MEDIUM: { bg: 'bg-sky-50',     text: 'text-sky-700',    ring: 'ring-sky-200',    label: 'Medium' },
  HIGH:   { bg: 'bg-amber-50',   text: 'text-amber-700',  ring: 'ring-amber-200',  label: 'High' },
  URGENT: { bg: 'bg-red-50',     text: 'text-red-700',    ring: 'ring-red-200',    label: 'Urgent' },
};

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function MaintenancePriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const s = PRIORITY_STYLE[priority];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}>
      {priority === 'URGENT' && <AlertTriangle className="mr-1 h-3 w-3" />}
      {s.label}
    </span>
  );
}
