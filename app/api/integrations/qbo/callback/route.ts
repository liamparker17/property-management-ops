import { NextResponse } from 'next/server';
import { IntegrationProvider } from '@prisma/client';
import { z } from 'zod';

import { withOrg } from '@/lib/auth/with-org';
import { qboAdapter } from '@/lib/integrations/qbo/adapter';
import { connectOrgIntegration } from '@/lib/services/org-integrations';

const qboCallbackSchema = z.object({
  authCode: z.string().trim().min(1),
  realmId: z.string().trim().min(1),
});

export const POST = withOrg(
  async (req, ctx) => {
    const input = qboCallbackSchema.parse(await req.json());
    const oauth = await qboAdapter.connectOAuth(ctx, input.authCode, input.realmId);
    const row = await connectOrgIntegration(ctx, IntegrationProvider.QUICKBOOKS, {
      externalAccountId: oauth.externalAccountId,
      accessToken: oauth.accessToken,
      refreshToken: oauth.refreshToken,
      tokenExpiresAt: oauth.expiresAt,
    });
    return NextResponse.json({ data: { id: row.id, provider: row.provider, status: row.status } });
  },
  { requireRole: ['ADMIN'] },
);
