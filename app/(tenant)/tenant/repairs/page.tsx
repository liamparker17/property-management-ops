import Link from 'next/link';
import { Wrench, Plus } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listTenantMaintenanceRequests } from '@/lib/services/maintenance';
import { MaintenanceStatusBadge, MaintenancePriorityBadge } from '@/components/maintenance-badges';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TenantRepairsPage() {
  const session = await auth();
  const rows = await listTenantMaintenanceRequests(session!.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Repairs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log an issue and track its status.
          </p>
        </div>
        <Link
          href="/tenant/repairs/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New request
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Need something fixed? Submit your first request.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/tenant/repairs/${r.id}`} className="font-medium hover:text-primary">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3"><MaintenancePriorityBadge priority={r.priority} /></td>
                  <td className="px-4 py-3"><MaintenanceStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
