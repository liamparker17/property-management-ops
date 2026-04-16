'use client';

import { useState } from 'react';

export function ChangePasswordForm() {
  const [status, setStatus] = useState<null | { ok: boolean; message: string }>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const form = new FormData(e.currentTarget);
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
      setStatus({ ok: false, message: json.error?.message ?? 'Failed' });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        Current password
        <input name="currentPassword" type="password" required className="rounded-md border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1">
        New password
        <input name="newPassword" type="password" required minLength={8} className="rounded-md border px-3 py-2" />
      </label>
      {status && (
        <p className={status.ok ? 'text-green-600' : 'text-red-600'}>{status.message}</p>
      )}
      <button type="submit" className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Change password
      </button>
    </form>
  );
}
