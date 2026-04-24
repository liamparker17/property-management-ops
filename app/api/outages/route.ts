import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { createPmOutage, listUpcomingOutages } from '@/lib/services/outages';

export const GET = withOrg(async (req, ctx) => {
  const propertyId = req.nextUrl.searchParams.get('propertyId') ?? undefined;
  const data = await listUpcomingOutages(ctx, { propertyId });
  return NextResponse.json({ data });
});

export const POST = withOrg(
  async (req, ctx) => {
    const body = (await req.json()) as {
      propertyId?: string;
      eskomAreaCode?: string;
      startsAt: string;
      endsAt: string;
      stage?: number;
      note?: string;
    };
    const data = await createPmOutage(ctx, body);
    return NextResponse.json({ data }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'MANAGING_AGENT'] },
);
