import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getDashboardSummary } from '@/lib/services/dashboard';

export const GET = withOrg(async (_req, ctx) => {
  return NextResponse.json({ data: await getDashboardSummary(ctx) });
});
