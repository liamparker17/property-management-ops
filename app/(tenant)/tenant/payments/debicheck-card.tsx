'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Status = 'NONE' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'REVOKED' | 'FAILED';

export function DebiCheckCard({
  leaseId,
  upperCapCents,
  initialStatus = 'NONE',
}: {
  leaseId: string;
  upperCapCents: number;
  initialStatus?: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestMandate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/tenant/debicheck/mandate-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ leaseId, upperCapCents }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to request mandate');
        return;
      }
      setStatus(json?.data?.status ?? 'PENDING_SIGNATURE');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          DebiCheck mandate
          <Badge variant={status === 'ACTIVE' ? 'default' : 'outline'} className="uppercase">
            {status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Sign a DebiCheck mandate in your banking app to authorise monthly rent collections up to
          the cap below.
        </p>
        {status === 'ACTIVE' ? null : (
          <Button onClick={requestMandate} disabled={busy} size="sm">
            {busy ? 'Requesting…' : 'Sign DebiCheck mandate in your banking app'}
          </Button>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
