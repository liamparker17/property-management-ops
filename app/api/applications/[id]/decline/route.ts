import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { declineApplication } from '@/lib/services/vetting';
import { applicationDecisionSchema } from '@/lib/zod/application';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = applicationDecisionSchema.parse(await req.json());
    return NextResponse.json({ data: await declineApplication(ctx, id, input) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
