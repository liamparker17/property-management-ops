'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Dup = { id: string; firstName: string; lastName: string; email: string | null; idNumber: string | null; phone: string | null };

export function TenantForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dupWarn, setDupWarn] = useState<Dup[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      email: form.get('email') || null,
      phone: form.get('phone') || null,
      idNumber: form.get('idNumber') || null,
      notes: form.get('notes') || null,
    };
    const res = await fetch('/api/tenants', {
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
    if (json.warnings?.duplicates?.length > 0) {
      setDupWarn(json.warnings.duplicates);
    }
    router.push(`/tenants/${json.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl grid-cols-2 gap-4 text-sm">
      <div className="space-y-2">
        <Label htmlFor="firstName">First name<span className="text-destructive">*</span></Label>
        <Input id="firstName" name="firstName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Last name<span className="text-destructive">*</span></Label>
        <Input id="lastName" name="lastName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="idNumber">ID / passport <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="idNumber" name="idNumber" />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      {dupWarn.length > 0 && (
        <div className="col-span-2 rounded-md border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-medium">Possible duplicate(s):</p>
          <ul className="mt-1 list-disc pl-5">
            {dupWarn.map((d) => (
              <li key={d.id}>{d.firstName} {d.lastName} — {d.email ?? d.phone ?? d.idNumber}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <div className="col-span-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="col-span-2 pt-2">
        <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
          {pending ? 'Saving…' : 'Create tenant'}
        </Button>
      </div>
    </form>
  );
}
