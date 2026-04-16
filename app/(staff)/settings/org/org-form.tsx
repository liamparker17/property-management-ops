'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OrgForm({ initial }: { initial: { name: string; expiringWindowDays: number } }) {
  const router = useRouter();
  const [status, setStatus] = useState<null | string>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/settings/org', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        expiringWindowDays: Number(form.get('expiringWindowDays')),
      }),
    });
    const json = await res.json();
    if (!res.ok) return setStatus(json.error?.message ?? 'Failed');
    setStatus('Saved');
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid max-w-md grid-cols-1 gap-3 text-sm">
      <label className="flex flex-col gap-1">
        Org name
        <input name="name" defaultValue={initial.name} required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        Expiring window (days)
        <input
          name="expiringWindowDays"
          type="number"
          min={1}
          max={365}
          defaultValue={initial.expiringWindowDays}
          required
          className="rounded-md border px-3 py-2"
        />
      </label>
      {status && <p className="text-green-700">{status}</p>}
      <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Save</button>
    </form>
  );
}
