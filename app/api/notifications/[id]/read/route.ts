import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { markNotificationRead } from '@/lib/services/notifications';

export const PATCH = withOrg(async (_req, ctx, params: { id: string }) => {
  const data = await markNotificationRead(ctx, params.id);
  return NextResponse.json({ data });
});
