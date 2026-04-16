'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function UnitForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        propertyId,
        label: form.get('label'),
        bedrooms: Number(form.get('bedrooms') ?? 0),
        bathrooms: Number(form.get('bathrooms') ?? 0),
        sizeSqm: form.get('sizeSqm') ? Number(form.get('sizeSqm')) : null,
        notes: form.get('notes') || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    router.push(`/units/${json.data.id}`);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <label className="col-span-2 flex flex-col gap-1">
        Label
        <input name="label" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Bedrooms
        <input name="bedrooms" type="number" min={0} defaultValue={0} className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Bathrooms
        <input name="bathrooms" type="number" min={0} defaultValue={0} className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Size (sqm)
        <input name="sizeSqm" type="number" min={1} className="rounded-md border px-3 py-2" />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        Notes
        <textarea name="notes" rows={3} className="rounded-md border px-3 py-2" />
      </label>
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Create unit
      </button>
    </form>
  );
}
