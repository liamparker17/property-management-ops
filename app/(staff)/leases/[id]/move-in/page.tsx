import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createInspection } from '@/lib/services/inspections';

export default async function MoveInGatewayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };

  const existing = await db.inspection.findFirst({
    where: { leaseId: id, type: 'MOVE_IN', orgId: ctx.orgId },
    select: { id: true },
  });
  if (existing) redirect(`/inspections/${existing.id}`);

  const created = await createInspection(ctx, {
    leaseId: id,
    type: 'MOVE_IN',
    scheduledAt: new Date().toISOString(),
  });
  redirect(`/inspections/${created.id}`);
}
