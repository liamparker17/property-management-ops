import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { runVerification } from '@/lib/services/backup';

export const POST = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await runVerification(ctx) }),
  { requireRole: ['ADMIN'] },
);
