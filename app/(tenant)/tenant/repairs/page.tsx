import Link from 'next/link';
import { Wrench, Plus } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listTenantMaintenanceRequests } from '@/lib/services/maintenance';
import { MaintenanceStatusBadge, MaintenancePriorityBadge } from '@/components/maintenance-badges';
import { formatDate } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function TenantRepairsPage() {
  const session = await auth();
  const rows = await listTenantMaintenanceRequests(session!.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Maintenance"
        title="Repairs"
        description="Log an issue and track its status."
        actions={
          <Link href="/tenant/repairs/new" className={cn(buttonVariants(), 'gap-1.5')}>
            <Plus className="h-4 w-4" />
            New request
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wrench className="size-5" />}
          title="No requests yet"
          description="Need something fixed? Submit your first request."
          action={
            <Link href="/tenant/repairs/new" className={cn(buttonVariants(), 'gap-1.5')}>
              <Plus className="h-4 w-4" />
              New request
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer transition-colors duration-150 even:bg-muted/15 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/tenant/repairs/${r.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <MaintenancePriorityBadge priority={r.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <MaintenanceStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
