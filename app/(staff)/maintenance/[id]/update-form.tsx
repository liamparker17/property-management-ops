'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Settings2 } from 'lucide-react';
import type { MaintenancePriority, MaintenanceStatus } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const NATIVE_SELECT =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
            <Settings2 className="size-4" />
          </span>
          Manage request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-status">Status</Label>
            <select
              id="m-status"
              value={s}
              onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
              className={NATIVE_SELECT}
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-priority">Priority</Label>
            <select
              id="m-priority"
              value={p}
              onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
              className={NATIVE_SELECT}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="m-notes">Internal notes</Label>
          <Textarea
            id="m-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Only visible to staff"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
