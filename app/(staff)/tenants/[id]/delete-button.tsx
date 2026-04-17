'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteTenantButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    const confirmed = window.prompt(
      `Permanently delete ${name}? All linked lease links, maintenance tickets, signatures, and their portal login will be removed. This cannot be undone.\n\nType the full name to confirm:`,
    );
    if (confirmed !== name) return;
    setBusy(true);
    const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error?.message ?? 'Failed to delete');
      setBusy(false);
      return;
    }
    router.push('/tenants');
  }
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
    >
      {busy ? 'Deleting…' : 'Delete permanently'}
    </button>
  );
}
