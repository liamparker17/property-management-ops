'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Initial = Partial<{
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string | null;
}>;

const PROVINCES = ['GP', 'WC', 'KZN', 'EC', 'FS', 'LP', 'MP', 'NW', 'NC'] as const;

export function PropertyForm({ mode, initial }: { mode: 'create' | 'edit'; initial?: Initial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (mode === 'create') {
      (payload as Record<string, unknown>).autoCreateMainUnit = form.get('autoCreateMainUnit') === 'on';
    }
    const url = mode === 'create' ? '/api/properties' : `/api/properties/${initial!.id}`;
    const res = await fetch(url, {
      method: mode === 'create' ? 'POST' : 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    router.push(mode === 'create' ? `/properties/${json.data.id}` : `/properties/${initial!.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <Field name="name" label="Name" required defaultValue={initial?.name} className="col-span-2" />
      <Field name="addressLine1" label="Address line 1" required defaultValue={initial?.addressLine1} className="col-span-2" />
      <Field name="addressLine2" label="Address line 2" defaultValue={initial?.addressLine2 ?? ''} className="col-span-2" />
      <Field name="suburb" label="Suburb" required defaultValue={initial?.suburb} />
      <Field name="city" label="City" required defaultValue={initial?.city} />
      <label className="flex flex-col gap-1">
        Province
        <select name="province" required defaultValue={initial?.province ?? 'GP'} className="rounded-md border px-3 py-2">
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <Field name="postalCode" label="Postal code" required defaultValue={initial?.postalCode} />
      <label className="col-span-2 flex flex-col gap-1">
        Notes
        <textarea name="notes" defaultValue={initial?.notes ?? ''} rows={3} className="rounded-md border px-3 py-2" />
      </label>
      {mode === 'create' && (
        <label className="col-span-2 flex items-center gap-2">
          <input type="checkbox" name="autoCreateMainUnit" defaultChecked />
          Auto-create a single &quot;Main&quot; unit (for standalone houses)
        </label>
      )}
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Saving…' : mode === 'create' ? 'Create property' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  required,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ''}`}>
      {label}
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ''}
        className="rounded-md border px-3 py-2"
      />
    </label>
  );
}
