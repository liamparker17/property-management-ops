import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { activateLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await activateLease(ctx, id);
  return NextResponse.json({ data: row });
});
