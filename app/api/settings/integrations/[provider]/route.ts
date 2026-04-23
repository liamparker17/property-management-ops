import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { disconnectOrgIntegration } from '@/lib/services/org-integrations';
import { disconnectOrgIntegrationSchema } from '@/lib/zod/org-integrations';

type Params = { provider: string };

export const DELETE = withOrg<Params>(
  async (_req, ctx, { provider }) => {
    const parsed = disconnectOrgIntegrationSchema.parse({ provider });
    await disconnectOrgIntegration(ctx, parsed.provider);
    return NextResponse.json({ data: { provider: parsed.provider, status: 'DISCONNECTED' } });
  },
  { requireRole: ['ADMIN'] },
);
