'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const NATIVE_SELECT =
  'flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

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
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="email">Email<span className="text-destructive">*</span></Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name<span className="text-destructive">*</span></Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select id="role" name="role" required defaultValue="PROPERTY_MANAGER" className={NATIVE_SELECT}>
          <option value="ADMIN">Admin</option>
          <option value="PROPERTY_MANAGER">Property manager</option>
          <option value="FINANCE">Finance</option>
          <option value="TENANT">Tenant</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Temporary password<span className="text-destructive">*</span></Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:col-span-2">
          {error}
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Creating…' : 'Create user'}
        </Button>
      </div>
    </form>
  );
}
