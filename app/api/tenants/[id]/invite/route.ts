import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { inviteTenantToPortal } from '@/lib/services/tenants';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const result = await inviteTenantToPortal(ctx, id);
    return NextResponse.json({ data: result });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
