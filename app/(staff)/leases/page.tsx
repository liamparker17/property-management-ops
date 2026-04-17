import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listLeases } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate, formatZar } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUSES = ['ALL', 'DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'TERMINATED', 'RENEWED'] as const;

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listLeases(ctx, {
    status: status && status !== 'ALL' ? (status as 'DRAFT') : undefined,
  });
  const activeStatus = status ?? 'ALL';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Leases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'lease' : 'leases'}
            {activeStatus !== 'ALL' ? ` · ${activeStatus.toLowerCase()}` : ''}.
          </p>
        </div>
        <Link
          href="/leases/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New lease
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-lg border bg-card p-1">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === 'ALL' ? '/leases' : `/leases?status=${s}`}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeStatus === s
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No leases found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeStatus === 'ALL' ? 'Create your first lease to get started.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Property · Unit</th>
                <th className="px-4 py-3">Tenants</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Rent</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((l) => {
                const primary = l.tenants.find((t) => t.isPrimary)?.tenant;
                return (
                  <tr key={l.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/leases/${l.id}`} className="font-medium hover:text-primary">
                        {l.unit.property.name} · {l.unit.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {primary ? `${primary.firstName} ${primary.lastName}` : <span className="text-muted-foreground">—</span>}
                      {l.tenants.length > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground">+{l.tenants.length - 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(l.startDate)} → {formatDate(l.endDate)}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatZar(l.rentAmountCents)}</td>
                    <td className="px-4 py-3">
                      <LeaseStatusBadge status={l.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
