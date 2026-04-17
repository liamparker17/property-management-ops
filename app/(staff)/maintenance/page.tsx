import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listMaintenanceRequests } from '@/lib/services/maintenance';
import { MaintenanceStatusBadge, MaintenancePriorityBadge } from '@/components/maintenance-badges';
import { formatDate } from '@/lib/format';
import type { MaintenanceStatus } from '@prisma/client';

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
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'request' : 'requests'}
          {filter !== 'ALL' ? ` (${filter.toLowerCase().replace('_', ' ')})` : ''}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Link
              key={f.value}
              href={f.value === 'ALL' ? '/maintenance' : `/maintenance?status=${f.value}`}
              className={
                active
                  ? 'inline-flex h-8 items-center rounded-full bg-primary px-3.5 text-xs font-medium text-primary-foreground'
                  : 'inline-flex h-8 items-center rounded-full border bg-card px-3.5 text-xs font-medium transition-colors hover:bg-muted'
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No requests</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When tenants submit maintenance requests, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/maintenance/${r.id}`} className="font-medium hover:text-primary">
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.tenant.firstName} {r.tenant.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.unit.property.name} · {r.unit.label}
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
