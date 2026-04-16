'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
      <label className="col-span-2 flex flex-col gap-1">
        Unit
        <select
          name="unitId"
          required
          defaultValue={initial?.unitId ?? ''}
          disabled={mode === 'renew'}
          className="rounded-md border px-3 py-2"
        >
          <option value="" disabled>— select —</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.propertyName} · {u.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="col-span-2 rounded-md border p-3">
        <legend className="px-1 text-xs uppercase text-muted-foreground">Tenants</legend>
        <div className="space-y-1">
          {tenants.map((t) => (
            <label key={t.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
              />
              <span>{t.firstName} {t.lastName}</span>
              {selected.includes(t.id) && selected.length > 1 && (
                <label className="ml-auto flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="primary"
                    checked={primary === t.id}
                    onChange={() => setPrimary(t.id)}
                  />
                  primary
                </label>
              )}
            </label>
          ))}
        </div>
        {selected.length === 1 && <p className="mt-2 text-xs text-muted-foreground">Single tenant is primary.</p>}
      </fieldset>

      <label className="flex flex-col gap-1">
        Start date
        <input type="date" name="startDate" required defaultValue={initial?.startDate} className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        End date
        <input type="date" name="endDate" required defaultValue={initial?.endDate} className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Monthly rent (ZAR)
        <input
          name="rentAmount"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={initial ? initial.rentAmountCents / 100 : undefined}
          className="rounded-md border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Deposit (ZAR)
        <input
          name="depositAmount"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={initial ? initial.depositAmountCents / 100 : undefined}
          className="rounded-md border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Payment due day (1–31)
        <input
          name="paymentDueDay"
          type="number"
          min={1}
          max={31}
          required
          defaultValue={initial?.paymentDueDay ?? 1}
          className="rounded-md border px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="heldInTrustAccount"
          defaultChecked={initial?.heldInTrustAccount ?? false}
        />
        Deposit held in trust account
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        Notes
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} className="rounded-md border px-3 py-2" />
      </label>
      {selected.length === 0 && <p className="col-span-2 text-xs text-red-600">Select at least one tenant.</p>}
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Saving…' : mode === 'renew' ? 'Create renewal (DRAFT)' : 'Create lease (DRAFT)'}
      </button>
    </form>
  );
}
