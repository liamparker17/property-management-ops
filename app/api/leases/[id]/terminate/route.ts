import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { terminateLeaseSchema } from '@/lib/zod/lease';
import { terminateLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const input = terminateLeaseSchema.parse(await req.json());
  const row = await terminateLease(ctx, id, input);
  return NextResponse.json({ data: row });
});
