'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
    <Button onClick={onClick} disabled={busy} variant="destructive" size="sm">
      <Trash2 className="size-4" />
      {busy ? 'Deleting…' : 'Delete permanently'}
    </Button>
  );
}
