import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';

export default async function LandlordMaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const row = await db.maintenanceRequest.findFirst({
    where: {
      id,
      orgId: ctx.orgId,
      unit: { property: { landlordId: ctx.user!.landlordId!, deletedAt: null } },
    },
    include: {
      unit: { include: { property: { select: { name: true } } } },
      vendor: true,
      quotes: true,
      worklogs: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Landlord Portal" title={row.title} description={`${row.unit.property.name} / ${row.unit.label}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[24px] font-light text-foreground">Status</h2>
          <p className="mt-4 text-sm text-muted-foreground">{row.status.replace('_', ' ')} · {row.priority}</p>
          <p className="mt-2 text-sm text-muted-foreground">{row.description}</p>
        </Card>
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[24px] font-light text-foreground">Vendor & cost</h2>
          <p className="mt-4 text-sm text-muted-foreground">{row.vendor?.name ?? 'Vendor not assigned'}</p>
          <p className="mt-2 text-sm text-muted-foreground">Invoice cents: {row.invoiceCents ?? 0}</p>
        </Card>
      </div>
    </div>
  );
}
