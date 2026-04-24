import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { generateLandlordTaxPack } from '@/lib/services/tax-reporting';
import { generateLandlordPackSchema } from '@/lib/zod/tax-pack';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = generateLandlordPackSchema.parse({
      ...(await req.json()),
      landlordId: id,
    });
    return NextResponse.json({
      data: await generateLandlordTaxPack(ctx, input.landlordId, input.yearId, {
        transmissionAdapter: input.transmissionAdapter,
      }),
    });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
