import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateDraftLeaseSchema } from '@/lib/zod/lease';
import { getLease, updateDraftLease } from '@/lib/services/leases';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getLease(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateDraftLeaseSchema.parse(await req.json());
  const row = await updateDraftLease(ctx, id, input);
  return NextResponse.json({ data: row });
});
