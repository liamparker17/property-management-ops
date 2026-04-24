import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import {
  listOffboardingCases,
  openOffboardingCase,
} from '@/lib/services/offboarding';
import { openOffboardingCaseSchema } from '@/lib/zod/offboarding';

export const GET = withOrg(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const rows = await listOffboardingCases(ctx, status ? { status } : undefined);
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = openOffboardingCaseSchema.parse(await req.json());
    const created = await openOffboardingCase(ctx, input.leaseId);
    return NextResponse.json({ data: created }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
