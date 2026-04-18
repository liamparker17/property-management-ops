'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
      <div className="space-y-2">
        <Label htmlFor="province">Province</Label>
        <select
          id="province"
          name="province"
          required
          defaultValue={initial?.province ?? 'GP'}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {PROVINCES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <Field name="postalCode" label="Postal code" required defaultValue={initial?.postalCode} />
      <div className="col-span-2 space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ''} rows={3} />
      </div>
      {mode === 'create' && (
        <label className="col-span-2 flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            name="autoCreateMainUnit"
            defaultChecked
            className="size-4 rounded border-input accent-primary"
          />
          <span>Auto-create a single &quot;Main&quot; unit (for standalone houses)</span>
        </label>
      )}
      {error && (
        <div className="col-span-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="col-span-2 pt-2">
        <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
          {pending ? 'Saving…' : mode === 'create' ? 'Create property' : 'Save changes'}
        </Button>
      </div>
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
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name}>{label}{required ? <span className="text-destructive">*</span> : null}</Label>
      <Input id={name} name={name} required={required} defaultValue={defaultValue ?? ''} />
    </div>
  );
}
