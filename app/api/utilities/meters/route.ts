import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createMeter, listMeters } from '@/lib/services/utilities';
import { createMeterSchema, utilityTypeEnum } from '@/lib/zod/utilities';

export const GET = withOrg(
  async (req, ctx) => {
    const url = new URL(req.url);
    const unitId = url.searchParams.get('unitId') ?? undefined;
    const rawType = url.searchParams.get('type');
    const type = rawType ? utilityTypeEnum.parse(rawType) : undefined;
    const includeRetired = url.searchParams.get('includeRetired') === 'true';
    const rows = await listMeters(ctx, { unitId, type, includeRetired });
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = createMeterSchema.parse(body);
    const row = await createMeter(ctx, parsed);
    return NextResponse.json({ data: row }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
