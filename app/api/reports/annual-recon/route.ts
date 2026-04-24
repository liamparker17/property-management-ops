import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { generateAnnualReconciliation } from '@/lib/services/year-end';
import { annualReconScopeSchema } from '@/lib/zod/year-end';

const generateAnnualReconSchema = z.object({
  yearId: z.string().cuid(),
  scope: annualReconScopeSchema,
});

export const GET = withOrg(
  async (req, ctx) => {
    const yearId = req.nextUrl.searchParams.get('yearId') || undefined;
    const where =
      ctx.role === 'LANDLORD'
        ? {
            orgId: ctx.orgId,
            scopeType: 'LANDLORD',
            scopeId: ctx.user?.landlordId ?? '__none__',
            ...(yearId ? { yearId } : {}),
          }
        : {
            orgId: ctx.orgId,
            ...(yearId ? { yearId } : {}),
          };

    if (ctx.role === 'LANDLORD' && !ctx.user?.landlordId) {
      throw ApiError.forbidden('Landlord account is not linked');
    }

    const rows = await db.annualReconciliation.findMany({
      where,
      orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }],
    });
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE', 'LANDLORD'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = generateAnnualReconSchema.parse(await req.json());
    return NextResponse.json({
      data: await generateAnnualReconciliation(ctx, input.yearId, input.scope),
    });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
