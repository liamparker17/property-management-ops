import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createUnitSchema } from '@/lib/zod/unit';
import { listUnits, createUnit } from '@/lib/services/units';

export const GET = withOrg(async (req, ctx) => {
  const propertyId = req.nextUrl.searchParams.get('propertyId') ?? undefined;
  const rows = await listUnits(ctx, { propertyId });
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createUnitSchema.parse(await req.json());
  const row = await createUnit(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
