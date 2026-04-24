import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { formatZar } from '@/lib/format';
import { assertCanReadProperty } from '@/lib/services/role-scope';

export default async function LandlordPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  await assertCanReadProperty(ctx, id);

  const property = await db.property.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    include: {
      units: {
        include: {
          leases: {
            where: { state: { in: ['ACTIVE', 'RENEWED'] } },
            include: {
              tenants: { where: { isPrimary: true }, include: { tenant: true } },
            },
          },
        },
      },
    },
  });
  if (!property) notFound();

  const [maintenanceRequests, invoices, ledgerEntries] = await Promise.all([
    db.maintenanceRequest.findMany({
      where: { orgId: ctx.orgId, unit: { propertyId: id } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    db.invoice.findMany({
      where: { lease: { unit: { propertyId: id } } },
      orderBy: { dueDate: 'desc' },
      take: 6,
      select: { id: true, dueDate: true, totalCents: true, amountCents: true, status: true },
    }),
    db.trustLedgerEntry.findMany({
      where: {
        landlordId: ctx.user!.landlordId!,
        lease: { unit: { propertyId: id } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Landlord Portal" title={property.name} description={`${property.addressLine1}, ${property.suburb}, ${property.city}`} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[26px] font-light text-foreground">Units & leases</h2>
          <div className="mt-4 space-y-3">
            {property.units.map((unit) => (
              <div key={unit.id} className="border border-border/70 px-4 py-3">
                <div className="font-medium text-foreground">{unit.label}</div>
                <div className="text-xs text-muted-foreground">
                  {unit.leases[0]?.tenants[0]?.tenant
                    ? `${unit.leases[0].tenants[0].tenant.firstName} ${unit.leases[0].tenants[0].tenant.lastName}`
                    : 'Vacant'}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[26px] font-light text-foreground">Open tickets</h2>
          <div className="mt-4 space-y-3">
            {maintenanceRequests.map((request) => (
              <div key={request.id} className="border border-border/70 px-4 py-3">
                <div className="font-medium text-foreground">{request.title}</div>
                <div className="text-xs text-muted-foreground">{request.status.replace('_', ' ')} · {request.priority}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[26px] font-light text-foreground">Recent invoices</h2>
          <div className="mt-4 space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="border border-border/70 px-4 py-3">
                <div className="font-medium text-foreground">{formatZar(invoice.totalCents > 0 ? invoice.totalCents : invoice.amountCents)}</div>
                <div className="text-xs text-muted-foreground">{invoice.status} · Due {invoice.dueDate.toISOString().slice(0, 10)}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[26px] font-light text-foreground">Recent trust entries</h2>
          <div className="mt-4 space-y-3">
            {ledgerEntries.map((entry) => (
              <div key={entry.id} className="border border-border/70 px-4 py-3">
                <div className="font-medium text-foreground">{entry.type.replace('_', ' ')}</div>
                <div className="text-xs text-muted-foreground">{formatZar(entry.amountCents)} · {entry.occurredAt.toISOString().slice(0, 10)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
