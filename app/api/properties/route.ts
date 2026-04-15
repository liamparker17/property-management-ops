import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createPropertySchema } from '@/lib/zod/property';
import { listProperties, createProperty } from '@/lib/services/properties';

export const GET = withOrg(async (_req, ctx) => {
  const rows = await listProperties(ctx);
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const body = await req.json();
  const input = createPropertySchema.parse(body);
  const row = await createProperty(ctx, input);
  return NextResponse.json({ data: row }, { status: 201 });
});
