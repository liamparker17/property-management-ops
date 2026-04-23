'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export function SelfManagedDebitOrderCard({
  leaseId,
  initialActive,
}: {
  leaseId: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(checked: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leases/${leaseId}/self-managed-debit-order`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: checked }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to update');
        return;
      }
      setActive(Boolean(json?.data?.selfManagedDebitOrderActive));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Self-managed debit order
          {active ? <Badge>Debit order active (self-managed)</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Set up a recurring debit order in your own banking app. Download the instruction PDF,
          follow the steps in your bank, then mark it as active so we know to expect the payment.
        </p>
        <a
          href={`/api/leases/${leaseId}/debit-order-instruction.pdf`}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Download instruction PDF
        </a>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={active}
            disabled={busy}
            onCheckedChange={(c) => toggle(Boolean(c))}
          />
          Mark as active
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
