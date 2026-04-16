'use client';
import { useRouter } from 'next/navigation';

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
    <button onClick={onClick} className="rounded-md border px-3 py-1.5 text-sm">
      {archived ? 'Unarchive' : 'Archive'}
    </button>
  );
}
