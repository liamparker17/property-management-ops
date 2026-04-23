import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { assignReviewer } from '@/lib/services/applications';
import { assignReviewerSchema } from '@/lib/zod/application';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = assignReviewerSchema.parse(await req.json());
    return NextResponse.json({ data: await assignReviewer(ctx, id, input.userId) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
