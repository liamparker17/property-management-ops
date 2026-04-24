import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { assertCanReadProperty } from '@/lib/services/role-scope';

export default async function AgentPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  await assertCanReadProperty(ctx, id);
  const property = await db.property.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    include: { units: true },
  });
  if (!property) notFound();
  const maintenanceRequests = await db.maintenanceRequest.findMany({
    where: { orgId: ctx.orgId, unit: { propertyId: id } },
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title={property.name} description={`${property.addressLine1}, ${property.suburb}, ${property.city}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[24px] font-light text-foreground">Units</h2>
          <div className="mt-4 space-y-3">
            {property.units.length === 0 ? (
              <EmptyState title="No units yet" description="Units added by the property manager will appear here." />
            ) : (
              property.units.map((unit) => (
                <div key={unit.id} className="border border-border/70 px-4 py-3">{unit.label}</div>
              ))
            )}
          </div>
        </Card>
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[24px] font-light text-foreground">Recent tickets</h2>
          <div className="mt-4 space-y-3">
            {maintenanceRequests.length === 0 ? (
              <EmptyState title="No tickets yet" description="Tenant-reported issues on this property will surface here." />
            ) : (
              maintenanceRequests.map((row) => (
                <div key={row.id} className="border border-border/70 px-4 py-3">
                  <div className="font-medium text-foreground">{row.title}</div>
                  <div className="text-xs text-muted-foreground">{row.status.replace('_', ' ')}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
