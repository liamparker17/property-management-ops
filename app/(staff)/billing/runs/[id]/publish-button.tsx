'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export function PublishRunButton({ runId, disabled, disabledReason }: {
  runId: string;
  disabled?: boolean;
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/billing/runs/${runId}/publish`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to publish run');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={submit} disabled={busy || disabled} size="sm">
        {busy ? 'Publishing…' : 'Publish run'}
      </Button>
      {disabled && disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
