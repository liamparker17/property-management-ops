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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type VendorOption = { id: string; name: string };

export function AssignVendorDialog({
  requestId,
  vendors,
}: {
  requestId: string;
  vendors: VendorOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? '');
  const [estimate, setEstimate] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) {
      setError('Select a vendor');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { vendorId };
      if (estimate.trim()) {
        const n = Math.round(Number(estimate) * 100);
        if (!Number.isFinite(n) || n <= 0) {
          setError('Invalid estimate');
          return;
        }
        body.estimatedCostCents = n;
      }
      if (scheduledFor.trim()) {
        body.scheduledFor = new Date(scheduledFor).toISOString();
      }
      const res = await fetch(`/api/maintenance/${requestId}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to assign');
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Assign contractor</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign contractor</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="av-vendor">Vendor</Label>
            <select
              id="av-vendor"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className={SELECT_CLS}
            >
              {vendors.length === 0 ? (
                <option value="">No active vendors — add one first</option>
              ) : (
                vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="av-estimate">Estimated cost (ZAR)</Label>
            <Input
              id="av-estimate"
              type="number"
              step="0.01"
              min="0"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="av-sched">Scheduled for</Label>
            <Input
              id="av-sched"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || vendors.length === 0}>
              {busy ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
