'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function FinaliseSettlementButton({ caseId, disabled }: { caseId: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finalise() {
    if (!confirm('Finalise this deposit settlement? This action cannot be reversed.')) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/offboarding/${caseId}/finalise`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to finalise');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button onClick={finalise} disabled={disabled || busy}>
        {busy ? 'Finalising…' : 'Finalise settlement'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
