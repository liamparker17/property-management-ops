import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { addMoveOutCharge, getOffboardingCase } from '@/lib/services/offboarding';
import { addMoveOutChargeSchema } from '@/lib/zod/offboarding';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    await getOffboardingCase(ctx, id);
    const rows = await db.moveOutCharge.findMany({
      where: { caseId: id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = addMoveOutChargeSchema.parse(await req.json());
    const charge = await addMoveOutCharge(ctx, id, input);
    return NextResponse.json({ data: charge }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
