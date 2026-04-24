import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { regenerateTaxPackCsv } from '@/lib/services/tax-reporting';
import { regeneratePackSchema } from '@/lib/zod/tax-pack';

type Params = { packId: string };

export const POST = withOrg<Params>(
  async (_req, ctx, { packId }) => {
    regeneratePackSchema.parse({ packId });
    return NextResponse.json({ data: await regenerateTaxPackCsv(ctx, packId) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
