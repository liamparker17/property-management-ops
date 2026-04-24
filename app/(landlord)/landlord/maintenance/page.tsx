import Link from 'next/link';
import { ShieldAlert, Wrench } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { withRoleScopeFilter } from '@/lib/services/role-scope';

export default async function LandlordMaintenancePage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  if (!ctx.user?.landlordId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Landlord Portal" title="Maintenance" description="Read-only maintenance queue for your properties." />
        <EmptyState
          icon={<ShieldAlert className="size-5" />}
          title="No landlord record linked"
          description="Ask your property manager to link your account to a landlord profile."
        />
      </div>
    );
  }
  const rows = await db.maintenanceRequest.findMany({
    where: {
      orgId: ctx.orgId,
      unit: { property: withRoleScopeFilter(ctx, { deletedAt: null }) },
    },
    include: {
      unit: { include: { property: { select: { name: true } } } },
      vendor: { select: { name: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Landlord Portal" title="Maintenance" description="Read-only maintenance queue for your properties." />
      <Card className="overflow-hidden border border-border p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Wrench className="size-5" />}
            title="No maintenance tickets"
            description="Tickets logged against your properties will appear here as they are reported."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--muted)]/35 text-left">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Vendor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <Link href={`/landlord/maintenance/${row.id}`} className="font-medium hover:underline">
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.unit.property.name} / {row.unit.label}</td>
                    <td className="px-4 py-3">{row.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{row.vendor?.name ?? 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
