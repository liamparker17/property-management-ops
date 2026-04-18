'use client';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function ArchiveTenantButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  async function onClick() {
    const method = archived ? 'DELETE' : 'POST';
    const res = await fetch(`/api/tenants/${id}/archive`, { method });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error?.message ?? 'Failed');
      return;
    }
    router.refresh();
  }
  return (
    <Button onClick={onClick} variant="outline" size="sm">
      {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
      {archived ? 'Unarchive' : 'Archive'}
    </Button>
  );
}
