import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { getOffboardingCase } from '@/lib/services/offboarding';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const row = await getOffboardingCase(ctx, id);

    if (ctx.role === 'TENANT') {
      const tenant = await db.tenant.findFirst({
        where: { userId: ctx.userId, orgId: ctx.orgId },
        select: { id: true },
      });
      if (!tenant) throw ApiError.forbidden('Tenant account is not linked');
      const link = await db.leaseTenant.findFirst({
        where: { leaseId: row.leaseId, tenantId: tenant.id, isPrimary: true },
        select: { leaseId: true },
      });
      if (!link) throw ApiError.forbidden('Cannot view this offboarding case');
    }

    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT'] },
);
