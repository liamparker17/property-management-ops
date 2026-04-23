import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { convertApplicationToTenant } from '@/lib/services/vetting';
import { convertApplicationSchema } from '@/lib/zod/application';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = convertApplicationSchema.parse(await req.json());
    return NextResponse.json({ data: await convertApplicationToTenant(ctx, id, input) }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
