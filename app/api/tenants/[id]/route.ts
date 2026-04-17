import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateTenantSchema } from '@/lib/zod/tenant';
import { getTenant, updateTenant, deleteTenant } from '@/lib/services/tenants';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await getTenant(ctx, id);
  return NextResponse.json({ data: row });
});

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const input = updateTenantSchema.parse(await req.json());
  const row = await updateTenant(ctx, id, input);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await deleteTenant(ctx, id);
  return NextResponse.json({ data: row });
});
