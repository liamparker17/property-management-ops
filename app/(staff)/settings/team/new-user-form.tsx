'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function NewUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/settings/team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        name: form.get('name'),
        role: form.get('role'),
        password: form.get('password'),
      }),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed');
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl grid-cols-2 gap-3 text-sm">
      <input name="email" type="email" placeholder="Email" required className="rounded-md border px-3 py-2" />
      <input name="name" placeholder="Name" required className="rounded-md border px-3 py-2" />
      <select name="role" required defaultValue="PROPERTY_MANAGER" className="rounded-md border px-3 py-2">
        <option value="ADMIN">ADMIN</option>
        <option value="PROPERTY_MANAGER">PROPERTY_MANAGER</option>
        <option value="FINANCE">FINANCE</option>
        <option value="TENANT">TENANT</option>
      </select>
      <input name="password" type="password" placeholder="Temporary password" minLength={8} required className="rounded-md border px-3 py-2" />
      {error && <p className="col-span-2 text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create user'}
      </button>
    </form>
  );
}
