import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getOrgFeatures, setOrgFeature } from '@/lib/services/org-features';
import { setOrgFeatureSchema } from '@/lib/zod/org-features';

export const GET = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await getOrgFeatures(ctx.orgId) }),
  { requireRole: ['ADMIN'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = setOrgFeatureSchema.parse(await req.json());
    return NextResponse.json({
      data: await setOrgFeature(ctx, input.key, input.enabled, input.config),
    });
  },
  { requireRole: ['ADMIN'] },
);
