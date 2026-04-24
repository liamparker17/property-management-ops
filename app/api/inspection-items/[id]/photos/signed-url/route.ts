import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { createSignedUploadUrl } from '@/lib/blob';

type Params = { id: string };

const bodySchema = z.object({
  contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
});

async function loadItemForCtx(itemId: string, orgId: string, role: string, userId: string) {
  const item = await db.inspectionItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      area: {
        select: {
          inspection: {
            select: {
              orgId: true,
              leaseId: true,
            },
          },
        },
      },
    },
  });
  if (!item || item.area.inspection.orgId !== orgId) throw ApiError.notFound('Inspection item not found');

  if (role === 'TENANT') {
    const tenant = await db.tenant.findFirst({ where: { userId, orgId }, select: { id: true } });
    if (!tenant) throw ApiError.forbidden('Tenant account is not linked');
    const link = await db.leaseTenant.findFirst({
      where: { leaseId: item.area.inspection.leaseId, tenantId: tenant.id },
      select: { leaseId: true },
    });
    if (!link) throw ApiError.forbidden('Photo upload not permitted for this inspection');
  }

  return item;
}

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = bodySchema.parse(await req.json());
    await loadItemForCtx(id, ctx.orgId, ctx.role, ctx.userId);
    const result = createSignedUploadUrl({
      pathname: `inspections/${ctx.orgId}/${id}`,
      contentType: input.contentType,
    });
    return NextResponse.json({ data: result });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'TENANT'] },
);
