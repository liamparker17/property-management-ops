'use client';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function DeletePropertyButton({ id }: { id: string }) {
  const router = useRouter();
  async function onClick() {
    if (!confirm('Delete this property? Blocked if it has active or draft leases.')) return;
    const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) {
      const code = json.error?.code;
      const blockingIds: string[] | undefined = json.error?.details?.blockingLeaseIds;
      if (code === 'CONFLICT' && blockingIds?.length) {
        alert(
          `Cannot delete: ${blockingIds.length} active or draft lease(s) still attached.\n\n` +
            `Blocking lease IDs:\n${blockingIds.join('\n')}\n\n` +
            `Terminate or remove those leases first.`,
        );
      } else {
        alert(json.error?.message ?? 'Failed');
      }
      return;
    }
    router.push('/properties');
    router.refresh();
  }
  return (
    <Button onClick={onClick} variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
      <Trash2 className="size-4" />
      Delete
    </Button>
  );
}
