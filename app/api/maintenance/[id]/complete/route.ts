import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { completeMaintenance } from '@/lib/services/maintenance';
import { completeMaintenanceSchema } from '@/lib/zod/maintenance';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const body = await req.json();
    const parsed = completeMaintenanceSchema.parse(body);
    const row = await completeMaintenance(ctx, id, parsed);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
