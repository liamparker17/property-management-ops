import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { createMandateRequest } from '@/lib/services/debicheck';
import { tenantDebicheckRequestSchema } from '@/lib/zod/stitch';

export const POST = withOrg(
  async (req, ctx) => {
    const input = tenantDebicheckRequestSchema.parse(await req.json());
    // Tenant must be on the lease they are requesting a mandate for.
    const tenant = await db.tenant.findFirst({
      where: { userId: ctx.userId, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!tenant) throw ApiError.forbidden('Tenant profile not found');
    const link = await db.leaseTenant.findFirst({
      where: { tenantId: tenant.id, leaseId: input.leaseId },
    });
    if (!link) throw ApiError.forbidden('Not your lease');

    const mandate = await createMandateRequest(ctx, input.leaseId, input.upperCapCents);
    return NextResponse.json({ data: mandate });
  },
  { requireRole: ['TENANT'] },
);
