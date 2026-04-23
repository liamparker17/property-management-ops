'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SOURCES = ['MANUAL', 'IMPORT', 'ESTIMATED', 'ROLLOVER'] as const;

export function MeterReadingForm({ meterId }: { meterId: string }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [takenAt, setTakenAt] = useState(today);
  const [readingValue, setReadingValue] = useState('');
  const [source, setSource] = useState<(typeof SOURCES)[number]>('MANUAL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/utilities/meters/${meterId}/readings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          takenAt: new Date(takenAt).toISOString(),
          readingValue,
          source,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to record reading');
        return;
      }
      setReadingValue('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr_140px_auto] sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="takenAt">Date</Label>
        <Input id="takenAt" type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="readingValue">Reading</Label>
        <Input
          id="readingValue"
          type="number"
          step="0.001"
          min="0"
          value={readingValue}
          onChange={(e) => setReadingValue(e.target.value)}
          required
          placeholder="0.000"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="source">Source</Label>
        <select
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value as (typeof SOURCES)[number])}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Record reading'}</Button>
      {error ? (
        <div className="sm:col-span-4 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </form>
  );
}
