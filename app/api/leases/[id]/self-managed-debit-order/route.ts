import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';

const schema = z.object({ active: z.boolean() });

export const POST = withOrg<{ id: string }>(
  async (req, ctx, params) => {
    const { active } = schema.parse(await req.json());
    const lease = await db.lease.findFirst({
      where: { id: params.id, orgId: ctx.orgId },
      select: { id: true, selfManagedDebitOrderActive: true },
    });
    if (!lease) throw ApiError.notFound('Lease not found');

    // Tenant role may flip their own lease on; staff may flip either way.
    if (ctx.role === 'TENANT') {
      const me = await db.tenant.findFirst({
        where: { userId: ctx.userId, orgId: ctx.orgId },
        select: { id: true },
      });
      const link = me
        ? await db.leaseTenant.findFirst({ where: { tenantId: me.id, leaseId: lease.id } })
        : null;
      if (!link) throw ApiError.forbidden('Not your lease');
    }

    const updated = await db.lease.update({
      where: { id: lease.id },
      data: { selfManagedDebitOrderActive: active },
    });
    await writeAudit(ctx, {
      entityType: 'Lease',
      entityId: lease.id,
      action: 'selfManagedDebitOrderToggled',
      diff: {
        before: { selfManagedDebitOrderActive: lease.selfManagedDebitOrderActive },
        after: { selfManagedDebitOrderActive: active },
      },
    });
    return NextResponse.json({
      data: { id: updated.id, selfManagedDebitOrderActive: updated.selfManagedDebitOrderActive },
    });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE', 'TENANT'] },
);
