import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { publishBillingRun } from '@/lib/services/billing';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const run = await publishBillingRun(ctx, id);
    return NextResponse.json({ data: run });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
