import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import {
  getMaintenanceRequest,
  updateMaintenanceRequest,
} from '@/lib/services/maintenance';
import { updateMaintenanceRequestSchema } from '@/lib/zod/maintenance';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getMaintenanceRequest(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = updateMaintenanceRequestSchema.parse(body);
    const row = await updateMaintenanceRequest(ctx, id, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
