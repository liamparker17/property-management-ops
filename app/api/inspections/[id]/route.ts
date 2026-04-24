import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { getInspection } from '@/lib/services/inspections';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const row = await getInspection(ctx, id);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'MANAGING_AGENT'] },
);
