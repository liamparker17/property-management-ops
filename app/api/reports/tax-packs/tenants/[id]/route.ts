import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { generateTenantTaxPack } from '@/lib/services/tax-reporting';
import { generateTenantPackSchema } from '@/lib/zod/tax-pack';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = generateTenantPackSchema.parse({
      ...(await req.json()),
      tenantId: id,
    });
    return NextResponse.json({
      data: await generateTenantTaxPack(ctx, input.tenantId, input.yearId, {
        transmissionAdapter: input.transmissionAdapter,
      }),
    });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
