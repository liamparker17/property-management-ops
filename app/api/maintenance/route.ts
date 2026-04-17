import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';
import { withOrg } from '@/lib/auth/with-org';
import {
  createTenantMaintenanceRequest,
  listMaintenanceRequests,
} from '@/lib/services/maintenance';
import { createMaintenanceRequestSchema } from '@/lib/zod/maintenance';
import type { MaintenanceStatus } from '@prisma/client';

export const GET = withOrg(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as MaintenanceStatus | null;
  const rows = await listMaintenanceRequests(ctx, status ? { status } : {});
  return NextResponse.json({ data: rows });
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw ApiError.unauthorized();
    if (session.user.role !== 'TENANT') throw ApiError.forbidden('Only tenants can submit requests');
    const body = await req.json();
    const parsed = createMaintenanceRequestSchema.parse(body);
    const row = await createTenantMaintenanceRequest(session.user.id, parsed);
    return NextResponse.json({ data: row });
  } catch (err) {
    return toErrorResponse(err);
  }
}
