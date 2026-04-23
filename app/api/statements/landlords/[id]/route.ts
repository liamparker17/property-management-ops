import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { generateLandlordStatement, listStatements } from '@/lib/services/statements';
import { generateStatementSchema } from '@/lib/zod/statements';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) =>
    NextResponse.json({
      data: await listStatements(ctx, { subjectType: 'Landlord', subjectId: id }),
    }),
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = generateStatementSchema.parse(await req.json());
    return NextResponse.json({ data: await generateLandlordStatement(ctx, id, input.period) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
