import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { resolveException } from '@/lib/services/reconciliations';
import { resolveExceptionSchema } from '@/lib/zod/reconciliations';

export const POST = withOrg<{ id: string }>(
  async (req, ctx, params) => {
    const input = resolveExceptionSchema.parse(await req.json());
    const exception = await resolveException(ctx, params.id, input.note);
    return NextResponse.json({ data: exception });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
