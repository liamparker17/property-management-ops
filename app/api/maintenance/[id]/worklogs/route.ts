import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { addMaintenanceWorklog } from '@/lib/services/maintenance';
import { addMaintenanceWorklogSchema } from '@/lib/zod/maintenance';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const rows = await db.maintenanceWorklog.findMany({
      where: { requestId: id, request: { orgId: ctx.orgId } },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = addMaintenanceWorklogSchema.parse(body);
    const row = await addMaintenanceWorklog(ctx, id, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
