import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { archiveTenant, unarchiveTenant } from '@/lib/services/tenants';

type Params = { id: string };

export const POST = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await archiveTenant(ctx, id);
  return NextResponse.json({ data: row });
});

export const DELETE = withOrg<Params>(async (_req, ctx, { id }) => {
  const row = await unarchiveTenant(ctx, id);
  return NextResponse.json({ data: row });
});
