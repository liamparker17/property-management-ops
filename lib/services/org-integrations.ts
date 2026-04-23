import type { IntegrationProvider, OrgIntegration } from '@prisma/client';
import { IntegrationStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { decrypt, encrypt } from '@/lib/crypto';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';

export type ConnectInput = {
  externalAccountId?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
};

export async function listOrgIntegrations(ctx: RouteCtx): Promise<OrgIntegration[]> {
  return db.orgIntegration.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { provider: 'asc' },
  });
}

export async function getOrgIntegration(
  ctx: RouteCtx,
  provider: IntegrationProvider,
): Promise<OrgIntegration | null> {
  return db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId: ctx.orgId, provider } },
  });
}

export async function connectOrgIntegration(
  ctx: RouteCtx,
  provider: IntegrationProvider,
  input: ConnectInput,
): Promise<OrgIntegration> {
  const accessTokenCipher = encrypt(input.accessToken);
  const refreshTokenCipher = input.refreshToken ? encrypt(input.refreshToken) : null;
  const now = new Date();

  const previous = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId: ctx.orgId, provider } },
    select: { status: true, externalAccountId: true },
  });

  const row = await db.orgIntegration.upsert({
    where: { orgId_provider: { orgId: ctx.orgId, provider } },
    update: {
      status: IntegrationStatus.CONNECTED,
      externalAccountId: input.externalAccountId ?? null,
      accessTokenCipher,
      refreshTokenCipher,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      connectedAt: now,
      connectedById: ctx.userId,
      lastError: null,
    },
    create: {
      orgId: ctx.orgId,
      provider,
      status: IntegrationStatus.CONNECTED,
      externalAccountId: input.externalAccountId ?? null,
      accessTokenCipher,
      refreshTokenCipher,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      connectedAt: now,
      connectedById: ctx.userId,
    },
  });

  await writeAudit(ctx, {
    entityType: 'OrgIntegration',
    entityId: row.id,
    action: 'connect',
    diff: {
      before: previous
        ? { status: previous.status, externalAccountId: previous.externalAccountId ?? null }
        : null,
      after: { status: row.status, externalAccountId: row.externalAccountId ?? null },
    },
    payload: { provider },
  });

  return row;
}

export async function disconnectOrgIntegration(
  ctx: RouteCtx,
  provider: IntegrationProvider,
): Promise<void> {
  const existing = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId: ctx.orgId, provider } },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw ApiError.notFound('Integration not connected');
  }

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId: ctx.orgId, provider } },
    data: {
      status: IntegrationStatus.DISCONNECTED,
      accessTokenCipher: null,
      refreshTokenCipher: null,
      tokenExpiresAt: null,
      connectedAt: null,
      connectedById: null,
      lastError: null,
    },
  });

  await writeAudit(ctx, {
    entityType: 'OrgIntegration',
    entityId: existing.id,
    action: 'disconnect',
    diff: {
      before: { status: existing.status },
      after: { status: IntegrationStatus.DISCONNECTED },
    },
    payload: { provider },
  });
}

export async function markIntegrationError(
  ctx: RouteCtx,
  provider: IntegrationProvider,
  message: string,
): Promise<void> {
  const existing = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId: ctx.orgId, provider } },
    select: { id: true, status: true, lastError: true },
  });

  if (!existing) {
    throw ApiError.notFound('Integration not connected');
  }

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId: ctx.orgId, provider } },
    data: {
      status: IntegrationStatus.ERROR,
      lastError: message,
    },
  });

  await writeAudit(ctx, {
    entityType: 'OrgIntegration',
    entityId: existing.id,
    action: 'mark-error',
    diff: {
      before: { status: existing.status, lastError: existing.lastError ?? null },
      after: { status: IntegrationStatus.ERROR, lastError: message },
    },
    payload: { provider },
  });
}

export type DecryptedTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
};

export async function readDecryptedTokens(
  ctx: RouteCtx,
  provider: IntegrationProvider,
): Promise<DecryptedTokens | null> {
  const row = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId: ctx.orgId, provider } },
  });

  if (!row) return null;
  if (row.status !== IntegrationStatus.CONNECTED) {
    throw ApiError.conflict(`Integration ${provider} is not connected`);
  }
  if (!row.accessTokenCipher) {
    throw ApiError.conflict(`Integration ${provider} has no access token`);
  }

  return {
    accessToken: decrypt(row.accessTokenCipher),
    ...(row.refreshTokenCipher ? { refreshToken: decrypt(row.refreshTokenCipher) } : {}),
    ...(row.tokenExpiresAt ? { expiresAt: row.tokenExpiresAt } : {}),
  };
}
