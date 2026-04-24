'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function CloseCaseButton({ caseId, disabled }: { caseId: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/offboarding/${caseId}/close`, { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json?.error?.message ?? 'Failed to close');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button variant="outline" onClick={close} disabled={disabled || busy}>
        {busy ? 'Closing…' : 'Close case'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
