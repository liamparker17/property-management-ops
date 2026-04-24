'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RESPONSIBILITIES = ['TENANT', 'LANDLORD', 'SHARED'] as const;

export function MoveOutChargeForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [responsibility, setResponsibility] = useState<string>('TENANT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (Number.isNaN(amountCents) || amountCents < 0 || !label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/offboarding/${caseId}/charges`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), amountCents, responsibility }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to add charge');
        return;
      }
      setLabel('');
      setAmount('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="charge-label">Charge</Label>
          <Input id="charge-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Carpet cleaning" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="charge-amount">Amount (R)</Label>
          <Input id="charge-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="grid items-end gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Responsibility</Label>
          <Select value={responsibility} onValueChange={(v) => setResponsibility(v ?? 'TENANT')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESPONSIBILITIES.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" size="sm" disabled={busy} className="md:col-start-3">
          {busy ? 'Adding…' : 'Add charge'}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

export function RemoveChargeButton({ caseId, chargeId, disabled }: { caseId: string; chargeId: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/offboarding/${caseId}/charges/${chargeId}`, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={remove} disabled={disabled || busy}>
      {busy ? 'Removing…' : 'Remove'}
    </Button>
  );
}
