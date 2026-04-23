import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

type Row = {
  id: string;
  orgId: string;
  provider: string;
  status: string;
  externalAccountId: string | null;
  accessTokenCipher: string | null;
  refreshTokenCipher: string | null;
  tokenExpiresAt: Date | null;
  connectedAt: Date | null;
  connectedById: string | null;
  lastError: string | null;
  updatedAt: Date;
};

const rows = new Map<string, Row>();
const auditCalls: any[] = [];

let db: any;
let listOrgIntegrations: any;
let getOrgIntegration: any;
let connectOrgIntegration: any;
let disconnectOrgIntegration: any;
let markIntegrationError: any;
let readDecryptedTokens: any;

let originalFindMany: any;
let originalFindUnique: any;
let originalUpsert: any;
let originalUpdate: any;
let originalAuditCreate: any;

function key(orgId: string, provider: string) {
  return `${orgId}:${provider}`;
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  originalFindMany = db.orgIntegration.findMany;
  originalFindUnique = db.orgIntegration.findUnique;
  originalUpsert = db.orgIntegration.upsert;
  originalUpdate = db.orgIntegration.update;
  originalAuditCreate = db.auditLog.create;

  db.orgIntegration.findMany = async ({ where }: any) =>
    [...rows.values()].filter((r) => r.orgId === where.orgId);
  db.orgIntegration.findUnique = async ({ where }: any) =>
    rows.get(key(where.orgId_provider.orgId, where.orgId_provider.provider)) ?? null;
  db.orgIntegration.upsert = async ({ where, update, create }: any) => {
    const mapKey = key(where.orgId_provider.orgId, where.orgId_provider.provider);
    const existing = rows.get(mapKey);
    const next: Row = existing
      ? { ...existing, ...update, updatedAt: new Date() }
      : {
          id: `int-${rows.size + 1}`,
          externalAccountId: null,
          accessTokenCipher: null,
          refreshTokenCipher: null,
          tokenExpiresAt: null,
          connectedAt: null,
          connectedById: null,
          lastError: null,
          updatedAt: new Date(),
          ...create,
        };
    rows.set(mapKey, next);
    return next;
  };
  db.orgIntegration.update = async ({ where, data }: any) => {
    const mapKey = key(where.orgId_provider.orgId, where.orgId_provider.provider);
    const existing = rows.get(mapKey);
    if (!existing) throw new Error('Row not found');
    const next = { ...existing, ...data, updatedAt: new Date() };
    rows.set(mapKey, next);
    return next;
  };
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `audit-${auditCalls.length}`, ...data };
  };

  const mod = (await import('@/lib/services/org-integrations')) as any;
  ({
    listOrgIntegrations,
    getOrgIntegration,
    connectOrgIntegration,
    disconnectOrgIntegration,
    markIntegrationError,
    readDecryptedTokens,
  } = mod);
});

after(async () => {
  db.orgIntegration.findMany = originalFindMany;
  db.orgIntegration.findUnique = originalFindUnique;
  db.orgIntegration.upsert = originalUpsert;
  db.orgIntegration.update = originalUpdate;
  db.auditLog.create = originalAuditCreate;
  await db.$disconnect();
});

beforeEach(() => {
  rows.clear();
  auditCalls.length = 0;
});

const ctx = { orgId: 'org-1', userId: 'user-1', role: 'ADMIN' } as const;

describe('org-integrations service', () => {
  it('connects a provider, stores ciphers, and audits', async () => {
    const row = await connectOrgIntegration(ctx, 'TPN', {
      externalAccountId: 'acct-xyz',
      accessToken: 'plaintext-access-token',
    });

    assert.equal(row.status, 'CONNECTED');
    assert.ok(row.accessTokenCipher);
    assert.notEqual(row.accessTokenCipher, 'plaintext-access-token');
    assert.equal(row.connectedById, 'user-1');
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].entityType, 'OrgIntegration');
    assert.equal(auditCalls[0].action, 'connect');
  });

  it('reads decrypted tokens for a CONNECTED integration', async () => {
    await connectOrgIntegration(ctx, 'TPN', {
      externalAccountId: 'acct-xyz',
      accessToken: 'tpn-api-key-42',
      refreshToken: 'refresh-99',
    });

    const tokens = await readDecryptedTokens(ctx, 'TPN');
    assert.ok(tokens);
    assert.equal(tokens.accessToken, 'tpn-api-key-42');
    assert.equal(tokens.refreshToken, 'refresh-99');
  });

  it('returns null from readDecryptedTokens when row is missing', async () => {
    const tokens = await readDecryptedTokens(ctx, 'TPN');
    assert.equal(tokens, null);
  });

  it('throws from readDecryptedTokens when integration is not CONNECTED', async () => {
    await connectOrgIntegration(ctx, 'TPN', { accessToken: 'a' });
    await markIntegrationError(ctx, 'TPN', 'upstream 500');

    await assert.rejects(() => readDecryptedTokens(ctx, 'TPN'), {
      code: 'CONFLICT',
      status: 409,
    });
  });

  it('markIntegrationError records the error and audits', async () => {
    await connectOrgIntegration(ctx, 'TPN', { accessToken: 'a' });
    auditCalls.length = 0;

    await markIntegrationError(ctx, 'TPN', 'boom');

    const got = await getOrgIntegration(ctx, 'TPN');
    assert.equal(got.status, 'ERROR');
    assert.equal(got.lastError, 'boom');
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].action, 'mark-error');
  });

  it('disconnect clears ciphers and audits', async () => {
    await connectOrgIntegration(ctx, 'TPN', { accessToken: 'a', refreshToken: 'r' });
    auditCalls.length = 0;

    await disconnectOrgIntegration(ctx, 'TPN');

    const got = await getOrgIntegration(ctx, 'TPN');
    assert.equal(got.status, 'DISCONNECTED');
    assert.equal(got.accessTokenCipher, null);
    assert.equal(got.refreshTokenCipher, null);
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].action, 'disconnect');
  });

  it('lists org integrations scoped to the org', async () => {
    await connectOrgIntegration(ctx, 'TPN', { accessToken: 'a' });
    await connectOrgIntegration(ctx, 'QUICKBOOKS', { accessToken: 'b' });

    const list = await listOrgIntegrations(ctx);
    assert.equal(list.length, 2);
  });
});
