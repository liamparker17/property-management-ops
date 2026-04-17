import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTenant } from '@/lib/services/tenants';
import { deriveStatus } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate } from '@/lib/format';
import { ArchiveTenantButton } from './archive-button';
import { InvitePortalButton } from './invite-button';

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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tenant.firstName} {tenant.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tenant.email ?? 'no email'} · {tenant.phone ?? 'no phone'}
            {tenant.idNumber ? ` · ID ${tenant.idNumber}` : ''}
          </p>
          {tenant.archivedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Archived {formatDate(tenant.archivedAt)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <ArchiveTenantButton id={id} archived={!!tenant.archivedAt} />
          {!tenant.archivedAt && tenant.email && (
            <InvitePortalButton tenantId={id} hasAccount={!!tenant.userId} />
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Leases</h2>
        {tenant.leases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not on any leases yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="border-b text-left">
              <tr>
                <th className="p-2">Property · Unit</th>
                <th className="p-2">Period</th>
                <th className="p-2">Role</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenant.leases.map((lt) => {
                const status = deriveStatus(lt.lease, 60);
                return (
                  <tr key={lt.leaseId} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <Link href={`/leases/${lt.leaseId}`} className="font-medium hover:underline">
                        {lt.lease.unit.property.name} · {lt.lease.unit.label}
                      </Link>
                    </td>
                    <td className="p-2">
                      {formatDate(lt.lease.startDate)} → {formatDate(lt.lease.endDate)}
                    </td>
                    <td className="p-2">{lt.isPrimary ? 'primary' : 'co-tenant'}</td>
                    <td className="p-2"><LeaseStatusBadge status={status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
