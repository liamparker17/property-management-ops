import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { listTariffs, upsertTariff } from '@/lib/services/utilities';
import { upsertUtilityTariffSchema, utilityTypeEnum } from '@/lib/zod/utilities';

export const GET = withOrg(
  async (req, ctx) => {
    const url = new URL(req.url);
    const propertyId = url.searchParams.get('propertyId');
    const rawType = url.searchParams.get('type');
    const type = rawType ? utilityTypeEnum.parse(rawType) : undefined;
    const rows = await listTariffs(ctx, {
      propertyId: propertyId === 'null' ? null : (propertyId ?? undefined),
      type,
    });
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const body = await req.json();
    const parsed = upsertUtilityTariffSchema.parse(body);
    const row = await upsertTariff(ctx, parsed);
    return NextResponse.json({ data: row }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
