import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { allocateReceipt } from '@/lib/services/payments';
import { allocateReceiptSchema } from '@/lib/zod/payments';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const raw = await req.text();
    const parsed = allocateReceiptSchema.parse(raw ? JSON.parse(raw) : {});
    const rows = await allocateReceipt(ctx, id, parsed);
    return NextResponse.json({ data: rows }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
