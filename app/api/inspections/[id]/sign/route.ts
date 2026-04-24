import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { signInspection } from '@/lib/services/inspections';
import { signInspectionSchema } from '@/lib/zod/inspection';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = signInspectionSchema.parse(await req.json());

    if (ctx.role === 'TENANT') {
      const inspection = await db.inspection.findFirst({
        where: { id, orgId: ctx.orgId },
        select: { leaseId: true },
      });
      if (!inspection) throw ApiError.notFound('Inspection not found');
      const tenant = await db.tenant.findFirst({
        where: { userId: ctx.userId, orgId: ctx.orgId },
        select: { id: true },
      });
      if (!tenant) throw ApiError.forbidden('Tenant account is not linked');
      const link = await db.leaseTenant.findFirst({
        where: { leaseId: inspection.leaseId, tenantId: tenant.id },
        select: { leaseId: true },
      });
      if (!link) throw ApiError.forbidden('Cannot sign inspections for other leases');
    }

    const sig = await signInspection(ctx, id, input);
    return NextResponse.json({ data: sig }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'LANDLORD', 'TENANT', 'MANAGING_AGENT'] },
);
