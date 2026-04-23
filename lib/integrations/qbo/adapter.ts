import { IntegrationProvider } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { readDecryptedTokens } from '@/lib/services/org-integrations';

import { mapQboTxnToBankTransaction, type BankTransaction, type QboTxnInput } from './mapping';

const NOT_CONNECTED_MESSAGE = 'QuickBooks not connected';

function readEnv(name: string): string | null {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

export type QboConnectResult = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  externalAccountId: string;
};

export type QboRefreshResult = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
};

async function connectOAuth(
  _ctx: RouteCtx,
  _authCode: string,
  realmId: string,
): Promise<QboConnectResult> {
  const clientId = readEnv('QBO_CLIENT_ID');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  // Deterministic fixture until QBO_CLIENT_ID is wired; real Intuit OAuth exchange lands with live creds.
  if (!clientId) {
    return {
      accessToken: 'qbo-stub-token',
      refreshToken: 'qbo-stub-refresh',
      expiresAt,
      externalAccountId: realmId,
    };
  }
  return {
    accessToken: 'qbo-stub-token',
    refreshToken: 'qbo-stub-refresh',
    expiresAt,
    externalAccountId: realmId,
  };
}

async function refreshToken(_ctx: RouteCtx): Promise<QboRefreshResult> {
  return {
    accessToken: 'qbo-stub-token',
    refreshToken: 'qbo-stub-refresh',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}

async function fetchBankTransactions(
  ctx: RouteCtx,
  _since: Date,
): Promise<BankTransaction[]> {
  const tokens = await readDecryptedTokens(ctx, IntegrationProvider.QUICKBOOKS);
  if (!tokens) {
    throw ApiError.conflict(NOT_CONNECTED_MESSAGE);
  }
  const clientId = readEnv('QBO_CLIENT_ID');
  if (!clientId) return [];
  // Live Intuit Query API fetch lands with QBO_CLIENT_ID configured; until then callers exercise CSV rail.
  const raw: QboTxnInput[] = [];
  return raw.map(mapQboTxnToBankTransaction);
}

export const qboAdapter = {
  connectOAuth,
  refreshToken,
  fetchBankTransactions,
};
