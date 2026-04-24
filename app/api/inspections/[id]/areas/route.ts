import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { recordArea } from '@/lib/services/inspections';
import { recordAreaSchema } from '@/lib/zod/inspection';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = recordAreaSchema.parse(await req.json());
    const area = await recordArea(ctx, id, input);
    return NextResponse.json({ data: area }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
