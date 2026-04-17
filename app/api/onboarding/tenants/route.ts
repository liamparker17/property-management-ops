import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { onboardTenantSchema } from '@/lib/zod/onboarding';
import { onboardTenant } from '@/lib/services/onboarding';

export const POST = withOrg(
  async (req, ctx) => {
    const input = onboardTenantSchema.parse(await req.json());
    const result = await onboardTenant(ctx, input);
    return NextResponse.json({ data: result }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
