import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateUnitSchema } from '@/lib/zod/unit';
import { getUnit, updateUnit, deleteUnit } from '@/lib/services/units';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getUnit(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateUnitSchema.parse(await req.json());
  const row = await updateUnit(ctx, id, input);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(async (_req, ctx, { id }) => {
  await deleteUnit(ctx, id);
  return NextResponse.json({ data: { id, deleted: true } });
});
