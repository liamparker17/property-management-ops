'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ReverseAllocationDialog({
  allocationId,
  isAdmin,
  ageDays,
}: {
  allocationId: string;
  isAdmin: boolean;
  ageDays: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = !isAdmin && ageDays > 30;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/allocations/${allocationId}/reverse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to reverse allocation');
        return;
      }
      setOpen(false);
      setReason('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" disabled={blocked}>Reverse</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse allocation</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {blocked ? (
            <p className="text-sm text-destructive">
              This allocation is older than 30 days and can only be reversed by an ADMIN.
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="Explain why this allocation is being reversed."
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || blocked}>{busy ? 'Reversing…' : 'Reverse'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
