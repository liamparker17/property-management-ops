import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { addManualLineItem } from '@/lib/services/billing';
import { addLineItemSchema } from '@/lib/zod/billing';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = addLineItemSchema.parse(body);
    const line = await addManualLineItem(ctx, id, parsed);
    return NextResponse.json({ data: line }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
