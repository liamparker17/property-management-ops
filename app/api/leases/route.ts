import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createLeaseSchema, leaseListQuerySchema } from '@/lib/zod/lease';
import { listLeases, createLease } from '@/lib/services/leases';

export const GET = withOrg(async (req, ctx) => {
  const query = leaseListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await listLeases(ctx, query);
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createLeaseSchema.parse(await req.json());
  const row = await createLease(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
