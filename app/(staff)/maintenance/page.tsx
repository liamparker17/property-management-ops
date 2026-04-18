import Link from 'next/link';
import { Wrench } from 'lucide-react';
import type { MaintenanceStatus } from '@prisma/client';

import { auth } from '@/lib/auth';
import { listMaintenanceRequests } from '@/lib/services/maintenance';
import { MaintenanceStatusBadge, MaintenancePriorityBadge } from '@/components/maintenance-badges';
import { formatDate } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FILTERS: Array<{ value: MaintenanceStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const filter = (status as MaintenanceStatus | 'ALL' | undefined) ?? 'ALL';
  const rows = await listMaintenanceRequests(
    ctx,
    filter && filter !== 'ALL' ? { status: filter as MaintenanceStatus } : {},
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Maintenance"
        description={`${rows.length} ${rows.length === 1 ? 'request' : 'requests'}${filter !== 'ALL' ? ` (${filter.toLowerCase().replace('_', ' ')})` : ''}.`}
      />

      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1 shadow-card">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Link
              key={f.value}
              href={f.value === 'ALL' ? '/maintenance' : `/maintenance?status=${f.value}`}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wrench className="size-5" />}
          title="No requests"
          description="When tenants submit maintenance requests, they'll appear here."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Unit</th>
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
                        href={`/maintenance/${r.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.tenant.firstName} {r.tenant.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.unit.property.name} · {r.unit.label}
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
