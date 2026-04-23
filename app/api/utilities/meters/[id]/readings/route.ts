import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { recordMeterReading } from '@/lib/services/utilities';
import { recordMeterReadingSchema } from '@/lib/zod/utilities';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = recordMeterReadingSchema.parse({ ...body, meterId: id });
    const row = await recordMeterReading(ctx, parsed);
    return NextResponse.json({ data: row }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
