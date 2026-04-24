import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { removeMoveOutCharge } from '@/lib/services/offboarding';

type Params = { id: string; chargeId: string };

export const DELETE = withOrg<Params>(
  async (_req, ctx, { chargeId }) => {
    await removeMoveOutCharge(ctx, chargeId);
    return NextResponse.json({ data: { ok: true } });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
