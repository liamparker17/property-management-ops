'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

type Props = {
  id: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  internalNotes: string | null;
};

export function MaintenanceUpdateForm({ id, status, priority, internalNotes }: Props) {
  const router = useRouter();
  const [s, setStatus] = useState(status);
  const [p, setPriority] = useState(priority);
  const [notes, setNotes] = useState(internalNotes ?? '');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setMsg(null);
    const res = await fetch(`/api/maintenance/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: s, priority: p, internalNotes: notes || null }),
    });
    if (res.ok) {
      setMsg('Saved');
      startTransition(() => router.refresh());
    } else {
      const json = await res.json().catch(() => ({}));
      setMsg(json.error?.message ?? 'Failed to save');
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Manage request
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Status</label>
          <select
            value={s}
            onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
            className="h-10 rounded-md border bg-card px-3 text-sm"
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Priority</label>
          <select
            value={p}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
            className="h-10 rounded-md border bg-card px-3 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Internal notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Only visible to staff"
          className="rounded-md border bg-card px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
