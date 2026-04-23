import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { removeLineItem } from '@/lib/services/billing';

type Params = { id: string };

export const DELETE = withOrg<Params>(
  async (_req, ctx, { id }) => {
    await removeLineItem(ctx, id);
    return NextResponse.json({ data: { id } });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
