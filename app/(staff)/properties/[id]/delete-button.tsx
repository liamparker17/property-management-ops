'use client';
import { useRouter } from 'next/navigation';

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
    <button onClick={onClick} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700">
      Delete
    </button>
  );
}
