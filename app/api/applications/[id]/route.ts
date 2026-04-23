import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { getApplication, updateApplication } from '@/lib/services/applications';
import { updateApplicationSchema } from '@/lib/zod/application';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => NextResponse.json({ data: await getApplication(ctx, id) }),
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const PATCH = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = updateApplicationSchema.parse(await req.json());
    return NextResponse.json({ data: await updateApplication(ctx, id, input) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
