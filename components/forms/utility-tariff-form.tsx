'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const UTILITY_TYPES = ['WATER', 'ELECTRICITY', 'GAS', 'SEWER', 'REFUSE', 'OTHER'] as const;

type PropertyOption = { id: string; name: string };

export function UtilityTariffForm({ properties }: { properties: PropertyOption[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<(typeof UTILITY_TYPES)[number]>('ELECTRICITY');
  const [propertyId, setPropertyId] = useState<string>('');
  const [structure] = useState<'FLAT'>('FLAT');
  const [flatUnitRate, setFlatUnitRate] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        type,
        propertyId: propertyId || null,
        structure,
        effectiveFrom: new Date(effectiveFrom).toISOString(),
        effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
        flatUnitRateCents: Math.round(Number(flatUnitRate) * 100),
      };
      const res = await fetch('/api/utilities/tariffs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to save tariff');
        return;
      }
      setFlatUnitRate('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <div className="space-y-2">
        <Label htmlFor="type">Utility</Label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as (typeof UTILITY_TYPES)[number])}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {UTILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="propertyId">Scope</Label>
        <select
          id="propertyId"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">Org-wide default</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="flatUnitRate">Flat unit rate (ZAR)</Label>
        <Input
          id="flatUnitRate"
          type="number"
          step="0.01"
          min="0"
          value={flatUnitRate}
          onChange={(e) => setFlatUnitRate(e.target.value)}
          required
          placeholder="e.g. 2.85"
        />
        <p className="text-xs text-muted-foreground">Tiered structures land in a later milestone.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="effectiveFrom">Effective from</Label>
        <Input id="effectiveFrom" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="effectiveTo">Effective to</Label>
        <Input id="effectiveTo" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
      </div>
      {error ? (
        <div className="col-span-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div className="col-span-2 pt-1">
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save tariff'}</Button>
      </div>
    </form>
  );
}
