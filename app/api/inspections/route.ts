import { NextResponse } from 'next/server';
import type { InspectionStatus, InspectionType } from '@prisma/client';

import { withOrg } from '@/lib/auth/with-org';
import { createInspection, listInspections } from '@/lib/services/inspections';
import { createInspectionSchema } from '@/lib/zod/inspection';

export const GET = withOrg(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const filters: {
      leaseId?: string;
      unitId?: string;
      type?: InspectionType;
      status?: InspectionStatus;
    } = {};
    const leaseId = searchParams.get('leaseId');
    const unitId = searchParams.get('unitId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    if (leaseId) filters.leaseId = leaseId;
    if (unitId) filters.unitId = unitId;
    if (type) filters.type = type as InspectionType;
    if (status) filters.status = status as InspectionStatus;

    const rows = await listInspections(ctx, filters);
    return NextResponse.json({ data: rows });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = createInspectionSchema.parse(await req.json());
    const created = await createInspection(ctx, input);
    return NextResponse.json({ data: created }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
