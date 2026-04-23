import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { createApplication, listApplications } from '@/lib/services/applications';
import { applicationListQuerySchema, createApplicationSchema } from '@/lib/zod/application';

export const GET = withOrg(
  async (req, ctx) => {
    const filters = applicationListQuerySchema.parse({
      stage: req.nextUrl.searchParams.get('stage') ?? undefined,
      assignedReviewerId: req.nextUrl.searchParams.get('assignedReviewerId') ?? undefined,
      propertyId: req.nextUrl.searchParams.get('propertyId') ?? undefined,
      q: req.nextUrl.searchParams.get('q') ?? undefined,
    });
    return NextResponse.json({ data: await listApplications(ctx, filters) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = createApplicationSchema.parse(await req.json());
    const row = await createApplication(ctx, input);
    return NextResponse.json({ data: row }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
