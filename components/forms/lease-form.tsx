'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type UnitOption = { id: string; label: string; propertyName: string };
type TenantOption = { id: string; firstName: string; lastName: string };

type Props = {
  mode: 'create' | 'renew';
  units: UnitOption[];
  tenants: TenantOption[];
  initial?: {
    unitId: string;
    tenantIds: string[];
    primaryTenantId: string;
    startDate: string;
    endDate: string;
    rentAmountCents: number;
    depositAmountCents: number;
    heldInTrustAccount: boolean;
    paymentDueDay: number;
    notes?: string | null;
  };
  postUrl: string;
};

const NATIVE_SELECT =
  'flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30';

export function LeaseForm({ mode, units, tenants, initial, postUrl }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initial?.tenantIds ?? []);
  const [primary, setPrimary] = useState<string>(initial?.primaryTenantId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(primary)) setPrimary(next[0] ?? '');
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      unitId: form.get('unitId'),
      tenantIds: selected,
      primaryTenantId: primary,
      startDate: form.get('startDate'),
      endDate: form.get('endDate'),
      rentAmountCents: Math.round(Number(form.get('rentAmount')) * 100),
      depositAmountCents: Math.round(Number(form.get('depositAmount')) * 100),
      heldInTrustAccount: form.get('heldInTrustAccount') === 'on',
      paymentDueDay: Number(form.get('paymentDueDay')),
      notes: form.get('notes') || null,
    };
    const res = await fetch(postUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    router.push(`/leases/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl grid-cols-2 gap-4 text-sm">
      <div className="col-span-2 space-y-2">
        <Label htmlFor="unitId">Unit<span className="text-destructive">*</span></Label>
        <select
          id="unitId"
          name="unitId"
          required
          defaultValue={initial?.unitId ?? ''}
          disabled={mode === 'renew'}
          className={NATIVE_SELECT}
        >
          <option value="" disabled>— select —</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.propertyName} · {u.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="col-span-2 rounded-lg border border-border bg-muted/20 p-4">
        <legend className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tenants</legend>
        <div className="space-y-1.5">
          {tenants.map((t) => (
            <label key={t.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50">
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
                className="size-4 rounded border-input accent-primary"
              />
              <span className="font-medium">{t.firstName} {t.lastName}</span>
              {selected.includes(t.id) && selected.length > 1 && (
                <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    name="primary"
                    checked={primary === t.id}
                    onChange={() => setPrimary(t.id)}
                    className="accent-primary"
                  />
                  primary
                </label>
              )}
            </label>
          ))}
        </div>
        {selected.length === 1 && <p className="mt-2 text-xs text-muted-foreground">Single tenant is primary.</p>}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="startDate">Start date<span className="text-destructive">*</span></Label>
        <Input id="startDate" type="date" name="startDate" required defaultValue={initial?.startDate} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="endDate">End date<span className="text-destructive">*</span></Label>
        <Input id="endDate" type="date" name="endDate" required defaultValue={initial?.endDate} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rentAmount">Monthly rent (ZAR)<span className="text-destructive">*</span></Label>
        <Input
          id="rentAmount"
          name="rentAmount"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={initial ? initial.rentAmountCents / 100 : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="depositAmount">Deposit (ZAR)<span className="text-destructive">*</span></Label>
        <Input
          id="depositAmount"
          name="depositAmount"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={initial ? initial.depositAmountCents / 100 : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentDueDay">Payment due day (1–31)<span className="text-destructive">*</span></Label>
        <Input
          id="paymentDueDay"
          name="paymentDueDay"
          type="number"
          min={1}
          max={31}
          required
          defaultValue={initial?.paymentDueDay ?? 1}
        />
      </div>
      <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          name="heldInTrustAccount"
          defaultChecked={initial?.heldInTrustAccount ?? false}
          className="size-4 rounded border-input accent-primary"
        />
        <span>Deposit held in trust account</span>
      </label>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={initial?.notes ?? ''} />
      </div>
      {selected.length === 0 && (
        <p className="col-span-2 text-xs text-destructive">Select at least one tenant.</p>
      )}
      {error && (
        <div className="col-span-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="col-span-2 pt-2">
        <Button
          type="submit"
          disabled={pending || selected.length === 0}
          size="lg"
          className="w-full sm:w-auto"
        >
          {pending ? 'Saving…' : mode === 'renew' ? 'Create renewal (DRAFT)' : 'Create lease (DRAFT)'}
        </Button>
      </div>
    </form>
  );
}
