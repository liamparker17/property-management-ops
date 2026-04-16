'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
      <label className="flex flex-col gap-1">
        First name
        <input name="firstName" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Last name
        <input name="lastName" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Email (optional)
        <input name="email" type="email" className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Phone (optional)
        <input name="phone" className="rounded-md border px-3 py-2" />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        ID / passport (optional)
        <input name="idNumber" className="rounded-md border px-3 py-2" />
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        Notes
        <textarea name="notes" rows={3} className="rounded-md border px-3 py-2" />
      </label>
      {dupWarn.length > 0 && (
        <div className="col-span-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs">
          Possible duplicate(s):
          <ul className="mt-1 list-disc pl-5">
            {dupWarn.map((d) => (
              <li key={d.id}>{d.firstName} {d.lastName} — {d.email ?? d.phone ?? d.idNumber}</li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Create tenant'}
      </button>
    </form>
  );
}
