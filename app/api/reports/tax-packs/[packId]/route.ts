import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { getPackOrThrow } from '@/lib/services/tax-reporting';

type Params = { packId: string };

export const GET = withOrg<Params>(async (_req, ctx, { packId }) => {
  return NextResponse.json({ data: await getPackOrThrow(ctx, packId) });
});
