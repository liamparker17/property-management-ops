import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { connectOrgIntegration } from '@/lib/services/org-integrations';
import { stitchConnectCallbackSchema } from '@/lib/zod/stitch';

export const POST = withOrg(
  async (req, ctx) => {
    const input = stitchConnectCallbackSchema.parse(await req.json());
    const row = await connectOrgIntegration(ctx, input.provider, {
      externalAccountId: input.externalAccountId ?? null,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
    });
    return NextResponse.json({ data: { id: row.id, provider: row.provider, status: row.status } });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
