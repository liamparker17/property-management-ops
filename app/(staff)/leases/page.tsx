import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listLeases } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate, formatZar } from '@/lib/format';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
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
      <PageHeader
        eyebrow="Agreements"
        title="Leases"
        description={`${rows.length} ${rows.length === 1 ? 'lease' : 'leases'}${activeStatus !== 'ALL' ? ` · ${activeStatus.toLowerCase()}` : ''}.`}
        actions={
          <Link href="/leases/new" className={cn(buttonVariants(), 'gap-1.5')}>
            <Plus className="h-4 w-4" />
            New lease
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1 shadow-card">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === 'ALL' ? '/leases' : `/leases?status=${s}`}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
              activeStatus === s
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No leases found"
          description={
            activeStatus === 'ALL'
              ? 'Create your first lease to get started.'
              : 'Try a different filter.'
          }
          action={
            activeStatus === 'ALL' ? (
              <Link href="/leases/new" className={cn(buttonVariants(), 'gap-1.5')}>
                <Plus className="h-4 w-4" />
                New lease
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Property · Unit</th>
                  <th className="px-4 py-3">Tenants</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Rent</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((l) => {
                  const primary = l.tenants.find((t) => t.isPrimary)?.tenant;
                  return (
                    <tr
                      key={l.id}
                      className="cursor-pointer transition-colors duration-150 even:bg-muted/15 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/leases/${l.id}`}
                          className="font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {l.unit.property.name} · {l.unit.label}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {primary ? (
                          <span>
                            {primary.firstName} {primary.lastName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
        </Card>
      )}
    </div>
  );
}
