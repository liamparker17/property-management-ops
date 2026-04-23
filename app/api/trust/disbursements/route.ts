import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { disburseToLandlord } from '@/lib/services/trust';
import { disburseToLandlordSchema } from '@/lib/zod/trust';

export const POST = withOrg(
  async (req, ctx) => {
    const input = disburseToLandlordSchema.parse(await req.json());
    const entry = await disburseToLandlord(ctx, input);
    return NextResponse.json({ data: entry }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
