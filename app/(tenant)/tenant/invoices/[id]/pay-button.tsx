'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function PayButton({ invoiceId, amountCents }: { invoiceId: string; amountCents: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/stitch/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoiceId, amountCents }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to start checkout');
        return;
      }
      const url = json?.data?.redirectUrl as string | undefined;
      if (url) {
        window.location.href = url;
      } else {
        setError('No redirect URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button size="sm" onClick={handleClick} disabled={busy}>
        {busy ? 'Starting…' : 'Pay now'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
