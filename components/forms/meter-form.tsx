'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const UTILITY_TYPES = ['WATER', 'ELECTRICITY', 'GAS', 'SEWER', 'REFUSE', 'OTHER'] as const;

type UnitOption = { id: string; label: string; propertyName: string };

export function MeterForm({ units }: { units: UnitOption[] }) {
  const router = useRouter();
  const [unitId, setUnitId] = useState(units[0]?.id ?? '');
  const [type, setType] = useState<(typeof UTILITY_TYPES)[number]>('ELECTRICITY');
  const [serial, setSerial] = useState('');
  const [installedAt, setInstalledAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { unitId, type };
      if (serial.trim()) body.serial = serial.trim();
      if (installedAt) body.installedAt = new Date(installedAt).toISOString();

      const res = await fetch('/api/utilities/meters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to create meter');
        return;
      }
      router.push(`/utilities/meters/${json.data.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <div className="col-span-2 space-y-2">
        <Label htmlFor="unitId">Unit</Label>
        <select
          id="unitId"
          required
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.propertyName} · {u.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as (typeof UTILITY_TYPES)[number])}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {UTILITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="serial">Serial</Label>
        <Input id="serial" value={serial} onChange={(e) => setSerial(e.target.value)} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="installedAt">Installed</Label>
        <Input id="installedAt" type="date" value={installedAt} onChange={(e) => setInstalledAt(e.target.value)} />
      </div>
      {error ? (
        <div className="col-span-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div className="col-span-2 pt-1">
        <Button type="submit" disabled={busy || !unitId} size="lg">
          {busy ? 'Saving…' : 'Create meter'}
        </Button>
      </div>
    </form>
  );
}
