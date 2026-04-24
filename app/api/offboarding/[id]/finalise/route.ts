import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { finaliseDepositSettlement } from '@/lib/services/offboarding';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const settlement = await finaliseDepositSettlement(ctx, id);
    return NextResponse.json({ data: settlement });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
