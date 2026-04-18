import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mail, Phone, IdCard, FileText } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getTenant } from '@/lib/services/tenants';
import { deriveStatus } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';

import { ArchiveTenantButton } from './archive-button';
import { DeleteTenantButton } from './delete-button';
import { InvitePortalButton } from './invite-button';

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default async function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let tenant;
  try {
    tenant = await getTenant(ctx, id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tenant"
        title={`${tenant.firstName} ${tenant.lastName}`}
        description={
          tenant.archivedAt
            ? `Archived ${formatDate(tenant.archivedAt)}`
            : undefined
        }
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <ArchiveTenantButton id={id} archived={!!tenant.archivedAt} />
              {tenant.archivedAt && (
                <DeleteTenantButton id={id} name={`${tenant.firstName} ${tenant.lastName}`.trim()} />
              )}
              {!tenant.archivedAt && tenant.email && (
                <InvitePortalButton tenantId={id} hasAccount={!!tenant.userId} />
              )}
            </div>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-xl font-semibold text-primary">
            {initials(tenant.firstName, tenant.lastName)}
          </div>
          <div className="grid flex-1 gap-3 text-sm sm:grid-cols-3">
            <DetailLine icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={tenant.email ?? '—'} />
            <DetailLine icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={tenant.phone ?? '—'} />
            <DetailLine icon={<IdCard className="h-3.5 w-3.5" />} label="ID" value={tenant.idNumber ?? '—'} />
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Leases</h2>
          <p className="text-sm text-muted-foreground">
            {tenant.leases.length === 0
              ? 'Not on any leases yet.'
              : `${tenant.leases.length} ${tenant.leases.length === 1 ? 'lease' : 'leases'} in history.`}
          </p>
        </div>

        {tenant.leases.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No leases on file"
            description="When this tenant is added to a lease, it'll show here."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Property · Unit</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {tenant.leases.map((lt) => {
                    const status = deriveStatus(lt.lease, 60);
                    return (
                      <tr
                        key={lt.leaseId}
                        className="cursor-pointer transition-colors duration-150 hover:bg-muted/40"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/leases/${lt.leaseId}`}
                            className="font-medium text-foreground transition-colors hover:text-primary"
                          >
                            {lt.lease.unit.property.name} · {lt.lease.unit.label}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(lt.lease.startDate)} → {formatDate(lt.lease.endDate)}
                        </td>
                        <td className="px-4 py-3">
                          {lt.isPrimary ? (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                              Primary
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Co-tenant</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <LeaseStatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}

function DetailLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-sm text-foreground">{value}</div>
    </div>
  );
}
