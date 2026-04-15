import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withOrg } from '@/lib/auth/with-org';
import { setPrimaryTenant } from '@/lib/services/leases';

type Params = { id: string };
const schema = z.object({ tenantId: z.string().min(1) });

export const PATCH = withOrg<Params>(async (req, ctx, { id }) => {
  const { tenantId } = schema.parse(await req.json());
  const row = await setPrimaryTenant(ctx, id, tenantId);
  return NextResponse.json({ data: row });
});
