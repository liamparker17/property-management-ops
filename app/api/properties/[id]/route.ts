import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updatePropertySchema } from '@/lib/zod/property';
import { getProperty, updateProperty, softDeleteProperty } from '@/lib/services/properties';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getProperty(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const body = await req.json();
  const input = updatePropertySchema.parse(body);
  const row = await updateProperty(ctx, id, input);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(
  async (_req, ctx, { id }) => {
    await softDeleteProperty(ctx, id);
    return NextResponse.json({ data: { id, deleted: true } });
  },
  { requireRole: ['ADMIN'] },
);
