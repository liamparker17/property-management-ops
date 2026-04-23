import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { generateTrustStatement } from '@/lib/services/statements';
import { generateStatementSchema } from '@/lib/zod/statements';

type Params = { landlordId: string };

export const POST = withOrg<Params>(
  async (req, ctx, { landlordId }) => {
    const input = generateStatementSchema.parse(await req.json());
    return NextResponse.json({
      data: await generateTrustStatement(ctx, landlordId, input.period),
    });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
