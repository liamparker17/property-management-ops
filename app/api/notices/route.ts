import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { createNotice, listNotices } from '@/lib/services/area-notices';
import { createNoticeSchema } from '@/lib/zod/area-notices';

export const GET = withOrg(async (_req, ctx) => {
  const data = await listNotices(ctx);
  return NextResponse.json({ data });
});

export const POST = withOrg(
  async (req, ctx) => {
    const body = createNoticeSchema.parse(await req.json());
    const data = await createNotice(ctx, body);
    return NextResponse.json({ data }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'MANAGING_AGENT'] },
);
