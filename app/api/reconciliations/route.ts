import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import {
  listReconciliationRuns,
  runTrustReconciliation,
} from '@/lib/services/reconciliations';
import { runReconciliationSchema } from '@/lib/zod/reconciliations';

export const GET = withOrg(
  async (_req, ctx) => {
    const runs = await listReconciliationRuns(ctx);
    return NextResponse.json({ data: runs });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = runReconciliationSchema.parse(await req.json());
    const run = await runTrustReconciliation(ctx, {
      start: input.periodStart,
      end: input.periodEnd,
    });
    return NextResponse.json({ data: run });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
