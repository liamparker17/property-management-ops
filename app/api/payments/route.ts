import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { listReceipts } from '@/lib/services/payments';

export const GET = withOrg(
  async (req, ctx) => {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') ?? undefined;
    const leaseId = url.searchParams.get('leaseId') ?? undefined;
    const source = url.searchParams.get('source') ?? undefined;
    const rows = await listReceipts(ctx, { tenantId, leaseId, source });
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
