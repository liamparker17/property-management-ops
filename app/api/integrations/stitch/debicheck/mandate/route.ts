import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { createMandateRequest } from '@/lib/services/debicheck';
import { debicheckMandateRequestSchema } from '@/lib/zod/stitch';

export const POST = withOrg(
  async (req, ctx) => {
    const input = debicheckMandateRequestSchema.parse(await req.json());
    const mandate = await createMandateRequest(ctx, input.leaseId, input.upperCapCents);
    return NextResponse.json({ data: mandate });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
