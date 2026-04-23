import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { requestTpnCheck } from '@/lib/services/tpn';
import { requestTpnCheckSchema } from '@/lib/zod/tpn';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (_req, ctx, { id }) => {
    requestTpnCheckSchema.parse({ applicationId: id });
    return NextResponse.json({ data: await requestTpnCheck(ctx, id) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
