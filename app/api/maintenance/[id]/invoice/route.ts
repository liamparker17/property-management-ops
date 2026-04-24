import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { captureMaintenanceInvoice } from '@/lib/services/maintenance';
import { captureMaintenanceInvoiceSchema } from '@/lib/zod/maintenance';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = captureMaintenanceInvoiceSchema.parse(body);
    const row = await captureMaintenanceInvoice(ctx, id, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
