import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { listOrgIntegrations } from '@/lib/services/org-integrations';

function redact<T extends { accessTokenCipher: string | null; refreshTokenCipher: string | null }>(
  row: T,
): Omit<T, 'accessTokenCipher' | 'refreshTokenCipher'> & {
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
} {
  const { accessTokenCipher, refreshTokenCipher, ...rest } = row;
  return {
    ...rest,
    hasAccessToken: Boolean(accessTokenCipher),
    hasRefreshToken: Boolean(refreshTokenCipher),
  };
}

export const GET = withOrg(
  async (_req, ctx) => {
    const rows = await listOrgIntegrations(ctx);
    return NextResponse.json({ data: rows.map(redact) });
  },
  { requireRole: ['ADMIN'] },
);
