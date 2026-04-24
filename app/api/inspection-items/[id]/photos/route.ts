import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';
import { registerPhotoSchema } from '@/lib/zod/inspection';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = registerPhotoSchema.parse(await req.json());

    const expectedPrefix = `inspections/${ctx.orgId}/${id}/`;
    if (!input.storageKey.startsWith(expectedPrefix)) {
      throw ApiError.validation({ storageKey: ['Storage key does not match this inspection item scope'] });
    }

    const item = await db.inspectionItem.findUnique({
      where: { id },
      select: { id: true, area: { select: { inspection: { select: { orgId: true, leaseId: true } } } } },
    });
    if (!item || item.area.inspection.orgId !== ctx.orgId) throw ApiError.notFound('Inspection item not found');

    if (ctx.role === 'TENANT') {
      const tenant = await db.tenant.findFirst({ where: { userId: ctx.userId, orgId: ctx.orgId }, select: { id: true } });
      if (!tenant) throw ApiError.forbidden('Tenant account is not linked');
      const link = await db.leaseTenant.findFirst({
        where: { leaseId: item.area.inspection.leaseId, tenantId: tenant.id },
        select: { leaseId: true },
      });
      if (!link) throw ApiError.forbidden('Photo upload not permitted for this inspection');
    }

    const photo = await db.inspectionPhoto.create({
      data: {
        itemId: id,
        storageKey: input.storageKey,
        caption: input.caption ?? null,
      },
    });

    await writeAudit(ctx, {
      entityType: 'InspectionPhoto',
      entityId: photo.id,
      action: 'registered',
      payload: { itemId: id, storageKey: input.storageKey },
    });

    return NextResponse.json({ data: photo }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT'] },
);
