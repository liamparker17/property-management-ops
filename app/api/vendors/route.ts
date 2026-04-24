import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createVendor, listVendors } from '@/lib/services/vendors';
import { createVendorSchema } from '@/lib/zod/vendors';

export const GET = withOrg(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === '1';
    const category = searchParams.get('category') ?? undefined;
    const rows = await listVendors(ctx, { includeArchived, category });
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = createVendorSchema.parse(body);
    const row = await createVendor(ctx, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
