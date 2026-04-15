import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateOrgSchema } from '@/lib/zod/team';
import { getOrg, updateOrg } from '@/lib/services/team';

export const GET = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await getOrg(ctx) }),
  { requireRole: ['ADMIN'] },
);

export const PATCH = withOrg(
  async (req, ctx) => {
    const input = updateOrgSchema.parse(await req.json());
    return NextResponse.json({ data: await updateOrg(ctx, input) });
  },
  { requireRole: ['ADMIN'] },
);
