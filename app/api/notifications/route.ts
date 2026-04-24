import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { listNotificationsForUser } from '@/lib/services/notifications';

export const GET = withOrg(async (req, ctx) => {
  const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '50');
  const data = await listNotificationsForUser(ctx, {
    unreadOnly,
    limit: Number.isFinite(limit) ? limit : 50,
  });
  return NextResponse.json({ data });
});
