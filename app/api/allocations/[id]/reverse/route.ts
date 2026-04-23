import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { reverseAllocation } from '@/lib/services/payments';
import { reverseAllocationSchema } from '@/lib/zod/payments';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const parsed = reverseAllocationSchema.parse(await req.json());
    await reverseAllocation(ctx, id, parsed.reason);
    return NextResponse.json({ data: { ok: true } });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
