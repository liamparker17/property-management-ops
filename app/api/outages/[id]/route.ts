import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { deletePmOutage, getOutage } from '@/lib/services/outages';

export const GET = withOrg(async (_req, ctx, params: { id: string }) => {
  const data = await getOutage(ctx, params.id);
  return NextResponse.json({ data });
});

export const DELETE = withOrg(
  async (_req, ctx, params: { id: string }) => {
    await deletePmOutage(ctx, params.id);
    return NextResponse.json({ data: { ok: true } });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
