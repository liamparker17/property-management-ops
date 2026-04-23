import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getBillingRun } from '@/lib/services/billing';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const run = await getBillingRun(ctx, id);
    return NextResponse.json({ data: run });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
