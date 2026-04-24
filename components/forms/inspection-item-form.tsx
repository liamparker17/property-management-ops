'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const;
const RESPONSIBILITIES = ['LANDLORD', 'TENANT', 'SHARED'] as const;

export function InspectionItemForm({ areaId }: { areaId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>('GOOD');
  const [note, setNote] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [responsibility, setResponsibility] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { label: trimmed, condition };
      if (note.trim()) body.note = note.trim();
      if (estimatedCost.trim()) {
        const rand = Number(estimatedCost);
        if (!Number.isFinite(rand) || rand < 0) {
          setError('Estimated cost must be a non-negative number (Rand)');
          setBusy(false);
          return;
        }
        body.estimatedCostCents = Math.round(rand * 100);
      }
      if (responsibility) body.responsibility = responsibility;

      const res = await fetch(`/api/inspection-areas/${areaId}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to add item');
        return;
      }
      setLabel('');
      setNote('');
      setEstimatedCost('');
      setResponsibility('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded border border-border/60 bg-muted/20 p-3">
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Item</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Stove, Walls" />
        </div>
        <div className="space-y-1">
          <Label>Condition</Label>
          <Select value={condition} onValueChange={(v) => setCondition(v as (typeof CONDITIONS)[number])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Estimated cost (R)</Label>
          <Input
            inputMode="decimal"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <Label>Responsibility</Label>
          <Select value={responsibility} onValueChange={(v) => setResponsibility(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {RESPONSIBILITIES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Note</Label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional details" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy || label.trim().length === 0}>
          {busy ? 'Adding…' : 'Add item'}
        </Button>
      </div>
    </form>
  );
}
