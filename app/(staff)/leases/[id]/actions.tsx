'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
    <div className="flex gap-2">
      {state === 'DRAFT' && (
        <button
          onClick={activate}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          Activate
        </button>
      )}
      {state === 'ACTIVE' && (
        <>
          <button
            onClick={() => router.push(`/leases/${id}/renew`)}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Renew
          </button>
          <button
            onClick={terminate}
            disabled={busy}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
          >
            Terminate
          </button>
        </>
      )}
    </div>
  );
}
