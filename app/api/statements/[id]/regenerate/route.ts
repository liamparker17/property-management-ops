import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { regenerateStatement } from '@/lib/services/statements';
import { regenerateStatementSchema } from '@/lib/zod/statements';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.text();
    regenerateStatementSchema.parse(body ? JSON.parse(body) : {});
    return NextResponse.json({ data: await regenerateStatement(ctx, id) });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
