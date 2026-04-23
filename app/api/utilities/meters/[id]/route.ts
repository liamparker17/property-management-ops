import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getMeter } from '@/lib/services/utilities';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const meter = await getMeter(ctx, id);
    return NextResponse.json({ data: meter });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
