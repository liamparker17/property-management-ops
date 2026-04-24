import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { recordItem } from '@/lib/services/inspections';
import { recordItemSchema } from '@/lib/zod/inspection';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = recordItemSchema.parse(await req.json());
    const item = await recordItem(ctx, id, input);
    return NextResponse.json({ data: item }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
