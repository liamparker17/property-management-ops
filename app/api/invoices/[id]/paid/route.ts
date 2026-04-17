import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { markInvoicePaid, markInvoiceUnpaid } from '@/lib/services/invoices';
import { markInvoicePaidSchema } from '@/lib/zod/invoice';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json().catch(() => ({}));
    const parsed = markInvoicePaidSchema.parse(body);
    const row = await markInvoicePaid(ctx, id, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);

export const DELETE = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const row = await markInvoiceUnpaid(ctx, id);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
