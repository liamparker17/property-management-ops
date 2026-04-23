import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { getReceipt } from '@/lib/services/payments';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const receipt = await getReceipt(ctx, id);
    return NextResponse.json({ data: receipt });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
