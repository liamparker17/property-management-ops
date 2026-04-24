import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { startInspection } from '@/lib/services/inspections';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const row = await startInspection(ctx, id);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
