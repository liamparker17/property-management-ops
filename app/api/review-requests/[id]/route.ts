import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { respondToReviewRequest } from '@/lib/services/signatures';
import { respondReviewRequestSchema } from '@/lib/zod/signature';

type Params = { id: string };

export const PATCH = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = respondReviewRequestSchema.parse(body);
    const row = await respondToReviewRequest(ctx, id, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
