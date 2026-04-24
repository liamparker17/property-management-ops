import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { publishNotice } from '@/lib/services/area-notices';
import { publishNoticeSchema } from '@/lib/zod/area-notices';

export const POST = withOrg(
  async (req, ctx, params: { id: string }) => {
    publishNoticeSchema.parse(await req.json().catch(() => ({})));
    const data = await publishNotice(ctx, params.id);
    return NextResponse.json({ data });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'MANAGING_AGENT'] },
);
