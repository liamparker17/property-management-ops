import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { getNotice } from '@/lib/services/area-notices';

export const GET = withOrg(async (_req, ctx, params: { id: string }) => {
  const data = await getNotice(ctx, params.id);
  return NextResponse.json({ data });
});
