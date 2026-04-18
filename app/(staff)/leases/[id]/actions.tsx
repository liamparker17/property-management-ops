'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function LeaseActions({
  id,
  state,
}: {
  id: string;
  state: 'DRAFT' | 'ACTIVE' | 'TERMINATED' | 'RENEWED';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function activate() {
    if (!confirm('Activate this draft lease? Will check for overlaps.')) return;
    setBusy(true);
    const res = await fetch(`/api/leases/${id}/activate`, { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return alert(json.error?.message ?? 'Failed');
    router.refresh();
  }

  async function terminate() {
    const reason = prompt('Termination reason');
    if (!reason) return;
    const today = new Date().toISOString().slice(0, 10);
    setBusy(true);
    const res = await fetch(`/api/leases/${id}/terminate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ terminatedAt: today, terminatedReason: reason }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return alert(json.error?.message ?? 'Failed');
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {state === 'DRAFT' && (
        <Button onClick={activate} disabled={busy} size="sm">
          <CheckCircle2 className="size-4" />
          Activate
        </Button>
      )}
      {state === 'ACTIVE' && (
        <>
          <Button onClick={() => router.push(`/leases/${id}/renew`)} variant="outline" size="sm">
            <RefreshCw className="size-4" />
            Renew
          </Button>
          <Button
            onClick={terminate}
            disabled={busy}
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="size-4" />
            Terminate
          </Button>
        </>
      )}
    </div>
  );
}
