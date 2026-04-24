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

export function CaptureInvoiceDialog({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [blobKey, setBlobKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(cents) || cents <= 0) {
        setError('Enter a valid invoice amount');
        return;
      }

      const storedBlobKey = blobKey.trim() || undefined;

      const body: Record<string, unknown> = { invoiceCents: cents };
      if (storedBlobKey) body.invoiceBlobKey = storedBlobKey;

      const res = await fetch(`/api/maintenance/${requestId}/invoice`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to capture invoice');
        return;
      }
      setSuccess('Posted to landlord ledger');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Capture invoice</Button>} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inv-amount">Invoice amount (ZAR)</Label>
            <Input
              id="inv-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-blob">Invoice blob key (optional)</Label>
            <Input
              id="inv-blob"
              type="text"
              value={blobKey}
              onChange={(e) => setBlobKey(e.target.value)}
              placeholder="Paste blob pathname if you have one"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? (
            <p className="text-sm text-primary">{success}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Close
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Posting…' : 'Post to ledger'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
