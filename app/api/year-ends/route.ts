import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { listYears, openYear } from '@/lib/services/year-end';
import { openYearSchema } from '@/lib/zod/year-end';

export const GET = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await listYears(ctx) }),
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = openYearSchema.parse(await req.json());
    return NextResponse.json({ data: await openYear(ctx, input) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
