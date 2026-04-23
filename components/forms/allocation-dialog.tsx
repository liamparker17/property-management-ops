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
import { Input } from '@/components/ui/input';

type OpenInvoiceLineItem = {
  id: string;
  description: string;
  outstandingCents: number;
};

export function AllocationDialog({
  receiptId,
  remainingCents,
  openLineItems,
}: {
  receiptId: string;
  remainingCents: number;
  openLineItems: OpenInvoiceLineItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manual, setManual] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let body: Record<string, unknown> = {};
      if (mode === 'manual') {
        const allocations = Object.entries(manual)
          .map(([invoiceLineItemId, raw]) => {
            const n = Math.round(Number(raw) * 100);
            if (!Number.isFinite(n) || n <= 0) return null;
            return { target: 'INVOICE_LINE_ITEM', invoiceLineItemId, amountCents: n };
          })
          .filter(Boolean);
        if (allocations.length === 0) {
          setError('Enter an amount for at least one line item.');
          return;
        }
        body = { allocations };
      }
      const res = await fetch(`/api/payments/${receiptId}/allocate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to allocate');
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
      <DialogTrigger render={<Button size="sm">Allocate</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Allocate receipt</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`rounded-full px-3 py-1 ${mode === 'auto' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Auto · oldest first
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`rounded-full px-3 py-1 ${mode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              Manual override
            </button>
          </div>

          {mode === 'auto' ? (
            <p className="text-sm text-muted-foreground">
              Will allocate up to {(remainingCents / 100).toFixed(2)} ZAR to the tenant&apos;s oldest open invoice line items.
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {openLineItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open line items found for this tenant&apos;s leases.</p>
              ) : (
                openLineItems.map((l) => (
                  <div key={l.id} className="grid grid-cols-[1fr_140px] items-center gap-2">
                    <div className="text-sm">
                      <div>{l.description}</div>
                      <div className="text-xs text-muted-foreground">
                        Outstanding {(l.outstandingCents / 100).toFixed(2)} ZAR
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`alloc-${l.id}`} className="sr-only">Amount</Label>
                      <Input
                        id={`alloc-${l.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={manual[l.id] ?? ''}
                        onChange={(e) => setManual((prev) => ({ ...prev, [l.id]: e.target.value }))}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>{busy ? 'Allocating…' : 'Allocate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
