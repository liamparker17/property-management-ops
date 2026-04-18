'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ChangePasswordForm() {
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.get('currentPassword'),
          newPassword: form.get('newPassword'),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setStatus({ ok: true, message: 'Password updated' });
        (e.target as HTMLFormElement).reset();
      } else {
        setStatus({ ok: false, message: json.error?.message ?? 'Failed to update' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      {status && (
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            status.ok
              ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/20 bg-destructive/5 text-destructive'
          }`}
        >
          {status.ok && <CheckCircle2 className="h-4 w-4" />}
          {status.message}
        </div>
      )}
      <div className="pt-1">
        <Button type="submit" disabled={pending} size="lg" className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Updating…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}
