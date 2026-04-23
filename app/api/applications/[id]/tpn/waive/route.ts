import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { waiveTpnCheck } from '@/lib/services/tpn';
import { waiveTpnCheckSchema } from '@/lib/zod/tpn';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = waiveTpnCheckSchema.parse({
      ...(await req.json()),
      applicationId: id,
    });
    return NextResponse.json({ data: await waiveTpnCheck(ctx, id, input.reason) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
