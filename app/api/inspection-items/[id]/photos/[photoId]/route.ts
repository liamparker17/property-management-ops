import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';

type Params = { id: string; photoId: string };

export const DELETE = withOrg<Params>(
  async (_req, ctx, { id, photoId }) => {
    const photo = await db.inspectionPhoto.findUnique({
      where: { id: photoId },
      select: { id: true, itemId: true, item: { select: { area: { select: { inspection: { select: { orgId: true } } } } } } },
    });
    if (!photo || photo.itemId !== id || photo.item.area.inspection.orgId !== ctx.orgId) {
      throw ApiError.notFound('Photo not found');
    }
    await db.inspectionPhoto.delete({ where: { id: photoId } });
    await writeAudit(ctx, {
      entityType: 'InspectionPhoto',
      entityId: photoId,
      action: 'deleted',
      payload: { itemId: id },
    });
    return NextResponse.json({ data: { id: photoId, deleted: true } });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
