import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createLeaseSchema } from '@/lib/zod/lease';
import { renewLease } from '@/lib/services/leases';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const input = createLeaseSchema.parse(await req.json());
  const row = await renewLease(ctx, id, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
