import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { captureTpnConsent } from '@/lib/services/tpn';
import { captureTpnConsentSchema } from '@/lib/zod/tpn';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = captureTpnConsentSchema.parse(await req.json());
    return NextResponse.json({ data: await captureTpnConsent(ctx, id, input) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
