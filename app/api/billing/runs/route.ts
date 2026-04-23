import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { generateBillingRun, listBillingRuns } from '@/lib/services/billing';
import { generateBillingRunSchema } from '@/lib/zod/billing';

export const GET = withOrg(
  async (_req, ctx) => {
    const rows = await listBillingRuns(ctx);
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = generateBillingRunSchema.parse(body);
    const run = await generateBillingRun(ctx, new Date(parsed.periodStart));
    return NextResponse.json({ data: run }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
