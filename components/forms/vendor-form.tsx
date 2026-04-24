'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type VendorFormValues = {
  id?: string;
  name?: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  categories?: string[];
};

export function VendorForm({ initial }: { initial?: VendorFormValues }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(initial?.id);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const categoriesRaw = String(form.get('categories') ?? '');
    const categories = categoriesRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      name: form.get('name'),
      contactName: form.get('contactName') || null,
      contactEmail: form.get('contactEmail') || null,
      contactPhone: form.get('contactPhone') || null,
      categories,
    };

    const url = isEdit ? `/api/vendors/${initial!.id}` : '/api/vendors';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    if (isEdit) {
      router.refresh();
    } else {
      router.push(`/maintenance/vendors/${json.data.id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <div className="col-span-2 space-y-2">
        <Label htmlFor="name">Name<span className="text-destructive">*</span></Label>
        <Input id="name" name="name" defaultValue={initial?.name ?? ''} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactName">Contact name</Label>
        <Input id="contactName" name="contactName" defaultValue={initial?.contactName ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPhone">Contact phone</Label>
        <Input id="contactPhone" name="contactPhone" defaultValue={initial?.contactPhone ?? ''} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input id="contactEmail" name="contactEmail" type="email" defaultValue={initial?.contactEmail ?? ''} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="categories">Categories (comma separated)</Label>
        <Input
          id="categories"
          name="categories"
          placeholder="Plumbing, Electrical"
          defaultValue={(initial?.categories ?? []).join(', ')}
        />
      </div>
      {error && (
        <div className="col-span-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="col-span-2 pt-2">
        <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create vendor'}
        </Button>
      </div>
    </form>
  );
}

export function ArchiveVendorButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (archived) {
    return (
      <span className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">
        Archived
      </span>
    );
  }

  return (
    <Button type="button" variant="outline" onClick={run} disabled={busy}>
      {busy ? 'Working…' : 'Archive'}
    </Button>
  );
}
