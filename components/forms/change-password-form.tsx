'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

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
      <div className="flex flex-col gap-1.5">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="h-10 rounded-md border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-10 rounded-md border bg-card px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      {status && (
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            status.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.ok && <CheckCircle2 className="h-4 w-4" />}
          {status.message}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Updating…' : 'Change password'}
      </button>
    </form>
  );
}
