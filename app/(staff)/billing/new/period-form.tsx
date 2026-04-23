'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function buildPeriodOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = -3; i <= 3; i++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1));
    const value = d.toISOString();
    const label = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label });
  }
  return options;
}

export function BillingRunPeriodForm() {
  const router = useRouter();
  const options = useMemo(buildPeriodOptions, []);
  const defaultOption = options.find((o) => {
    const d = new Date(o.value);
    const now = new Date();
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  }) ?? options[0];

  const [periodStart, setPeriodStart] = useState(defaultOption.value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ periodStart }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to generate billing run');
        return;
      }
      router.push(`/billing/runs/${json.data.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-5 text-sm">
      <div className="space-y-2">
        <Label htmlFor="periodStart">Billing period</Label>
        <select
          id="periodStart"
          name="periodStart"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Runs are idempotent. Re-running a period rebuilds rent + utility line items.
        </p>
      </div>
      {error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div className="pt-1">
        <Button type="submit" disabled={busy} size="lg">
          {busy ? 'Generating…' : 'Generate run'}
        </Button>
      </div>
    </form>
  );
}
