import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { lockYear } from '@/lib/services/year-end';
import { lockYearSchema } from '@/lib/zod/year-end';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (_req, ctx, { id }) => {
    lockYearSchema.parse({ yearId: id });
    return NextResponse.json({ data: await lockYear(ctx, id) });
  },
  { requireRole: ['ADMIN'] },
);
