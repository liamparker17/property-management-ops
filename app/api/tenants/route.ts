import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createTenantSchema } from '@/lib/zod/tenant';
import { listTenants, createTenant, detectDuplicates } from '@/lib/services/tenants';

export const GET = withOrg(async (req, ctx) => {
  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';
  const rows = await listTenants(ctx, { includeArchived });
  return NextResponse.json({ data: rows });
});

export const POST = withOrg(async (req, ctx) => {
  const input = createTenantSchema.parse(await req.json());
  const duplicates = await detectDuplicates(ctx, input);
  const row = await createTenant(ctx, input);
  return NextResponse.json({ data: row, warnings: { duplicates } }, { status: 201 });
});
