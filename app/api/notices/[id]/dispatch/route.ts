import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { dispatchNotice } from '@/lib/services/area-notices';
import { dispatchNoticeSchema } from '@/lib/zod/area-notices';

export const POST = withOrg(
  async (req, ctx, params: { id: string }) => {
    dispatchNoticeSchema.parse(await req.json().catch(() => ({})));
    const data = await dispatchNotice(ctx, params.id);
    return NextResponse.json({ data });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
