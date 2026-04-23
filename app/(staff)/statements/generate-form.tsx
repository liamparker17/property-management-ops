'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GenerateStatementForm({
  endpoint,
  redirectToDetail = true,
}: {
  endpoint: string;
  redirectToDetail?: boolean;
}) {
  const router = useRouter();
  const today = new Date();
  const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [start, setStart] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [end, setEnd] = useState(today.toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          period: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to generate statement');
        return;
      }
      if (redirectToDetail && json.data?.id) {
        router.push(`/statements/${json.data.id}`);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_160px_auto] sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="start">From</Label>
        <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="end">To</Label>
        <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy}>{busy ? 'Generating…' : 'Generate'}</Button>
      {error ? (
        <div className="sm:col-span-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </form>
  );
}
