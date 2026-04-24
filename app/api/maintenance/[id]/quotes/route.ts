import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { captureQuote } from '@/lib/services/maintenance';
import { captureQuoteSchema } from '@/lib/zod/maintenance';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const rows = await db.maintenanceQuote.findMany({
      where: { requestId: id, request: { orgId: ctx.orgId } },
      orderBy: { createdAt: 'desc' },
      include: { vendor: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = captureQuoteSchema.parse(body);
    const row = await captureQuote(ctx, id, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
