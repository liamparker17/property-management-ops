import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { submitApplication } from '@/lib/services/applications';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (_req, ctx, { id }) => NextResponse.json({ data: await submitApplication(ctx, id) }),
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
