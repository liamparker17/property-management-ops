import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { completeInspection } from '@/lib/services/inspections';
import { completeInspectionSchema } from '@/lib/zod/inspection';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const text = await req.text();
    const json = text ? JSON.parse(text) : {};
    const input = completeInspectionSchema.parse(json);
    const row = await completeInspection(ctx, id, input);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'MANAGING_AGENT'] },
);
