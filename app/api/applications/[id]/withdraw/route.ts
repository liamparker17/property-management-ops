import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { withdrawApplication } from '@/lib/services/applications';
import { withdrawApplicationSchema } from '@/lib/zod/application';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = withdrawApplicationSchema.parse(await req.json());
    return NextResponse.json({ data: await withdrawApplication(ctx, id, input.reason) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
