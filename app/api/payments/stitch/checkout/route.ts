import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { initiateInboundPayment } from '@/lib/services/stitch-payments';
import { stitchCheckoutSchema } from '@/lib/zod/stitch';

export const POST = withOrg(
  async (req, ctx) => {
    const input = stitchCheckoutSchema.parse(await req.json());
    const result = await initiateInboundPayment(ctx, input);
    return NextResponse.json({ data: result });
  },
  { requireRole: ['TENANT'] },
);
