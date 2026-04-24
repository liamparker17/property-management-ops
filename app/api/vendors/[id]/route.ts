import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { archiveVendor, getVendor, updateVendor } from '@/lib/services/vendors';
import { updateVendorSchema } from '@/lib/zod/vendors';

type Params = { id: string };

export const GET = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const row = await getVendor(ctx, id);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const PATCH = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = updateVendorSchema.parse(body);
    const row = await updateVendor(ctx, id, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const DELETE = withOrg<Params>(
  async (_req, ctx, { id }) => {
    const row = await archiveVendor(ctx, id);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
