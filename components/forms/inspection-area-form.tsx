'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function InspectionAreaForm({
  inspectionId,
  nextOrderIndex,
}: {
  inspectionId: string;
  nextOrderIndex: number;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/areas`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmed, orderIndex: nextOrderIndex }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to add area');
        return;
      }
      setName('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="grow space-y-1">
        <Label htmlFor="area-name">Area name</Label>
        <Input
          id="area-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kitchen, Bedroom 1"
        />
      </div>
      <Button type="submit" size="sm" disabled={busy || name.trim().length === 0}>
        {busy ? 'Adding…' : 'Add area'}
      </Button>
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
