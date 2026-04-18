'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function UnitForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
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
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    router.push(`/units/${json.data.id}`);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <div className="col-span-2 space-y-2">
        <Label htmlFor="label">Label<span className="text-destructive">*</span></Label>
        <Input id="label" name="label" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bedrooms">Bedrooms</Label>
        <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={0} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bathrooms">Bathrooms</Label>
        <Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={0} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sizeSqm">Size (sqm)</Label>
        <Input id="sizeSqm" name="sizeSqm" type="number" min={1} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      {error && (
        <div className="col-span-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="col-span-2 pt-2">
        <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
          {pending ? 'Saving…' : 'Create unit'}
        </Button>
      </div>
    </form>
  );
}
