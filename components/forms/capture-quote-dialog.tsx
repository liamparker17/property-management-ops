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
import { Textarea } from '@/components/ui/textarea';

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type VendorOption = { id: string; name: string };

export function CaptureQuoteDialog({
  requestId,
  vendors,
}: {
  requestId: string;
  vendors: VendorOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState('');
  const [docKey, setDocKey] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(cents) || cents <= 0) {
        setError('Enter a valid amount');
        return;
      }

      const storedDocKey = docKey.trim() || undefined;

      const body: Record<string, unknown> = { amountCents: cents };
      if (vendorId) body.vendorId = vendorId;
      if (storedDocKey) body.documentStorageKey = storedDocKey;
      if (note.trim()) body.note = note.trim();

      const res = await fetch(`/api/maintenance/${requestId}/quotes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to capture quote');
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
      <DialogTrigger render={<Button size="sm" variant="outline">Capture quote</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture quote</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="q-vendor">Vendor (optional)</Label>
            <select
              id="q-vendor"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="">—</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-amount">Amount (ZAR)</Label>
            <Input
              id="q-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-doc">Document storage key (optional)</Label>
            <Input
              id="q-doc"
              type="text"
              value={docKey}
              onChange={(e) => setDocKey(e.target.value)}
              placeholder="Paste blob pathname if you have one"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-note">Note</Label>
            <Textarea
              id="q-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Capture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
