import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');
delete process.env.QBO_CLIENT_ID;

let db: any;
let qbo: any;

const orgIntegrationRows = new Map<string, any>();
const originals: Record<string, any> = {};

function save(path: string, fn: any) {
  originals[path] = fn;
}
function restoreAll() {
  for (const [path, fn] of Object.entries(originals)) {
    const [ns, method] = path.split('.');
    (db as any)[ns][method] = fn;
  }
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  save('orgIntegration.findUnique', db.orgIntegration.findUnique);
  db.orgIntegration.findUnique = async ({ where }: any) => {
    const k = where.orgId_provider
      ? `${where.orgId_provider.orgId}:${where.orgId_provider.provider}`
      : where.id;
    return orgIntegrationRows.get(k) ?? null;
  };
  qbo = (await import('@/lib/integrations/qbo/adapter')) as any;
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  orgIntegrationRows.clear();
  delete process.env.QBO_CLIENT_ID;
});

describe('qboAdapter', () => {
  it('connectOAuth returns deterministic stub when QBO_CLIENT_ID is unset', async () => {
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    const r = await qbo.qboAdapter.connectOAuth(ctx, 'authcode-xyz', 'realm-42');
    assert.equal(r.accessToken, 'qbo-stub-token');
    assert.equal(r.refreshToken, 'qbo-stub-refresh');
    assert.equal(r.externalAccountId, 'realm-42');
    assert.ok(r.expiresAt instanceof Date);
    assert.ok(r.expiresAt.getTime() > Date.now());
  });

  it('fetchBankTransactions throws CONFLICT when no OrgIntegration row exists', async () => {
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    await assert.rejects(
      () => qbo.qboAdapter.fetchBankTransactions(ctx, new Date('2026-04-01')),
      (err: any) => err?.code === 'CONFLICT' && /not connected/i.test(err?.message ?? ''),
    );
  });

  it('fetchBankTransactions returns [] when connected but QBO_CLIENT_ID missing', async () => {
    orgIntegrationRows.set('org-1:QUICKBOOKS', {
      id: 'oi-1',
      orgId: 'org-1',
      provider: 'QUICKBOOKS',
      status: 'CONNECTED',
      accessTokenCipher: 'cipher',
      refreshTokenCipher: null,
      tokenExpiresAt: null,
    });

    const { encrypt } = (await import('@/lib/crypto')) as any;
    orgIntegrationRows.get('org-1:QUICKBOOKS').accessTokenCipher = encrypt('qbo-stub-token');

    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    const rows = await qbo.qboAdapter.fetchBankTransactions(ctx, new Date('2026-04-01'));
    assert.ok(Array.isArray(rows));
    assert.equal(rows.length, 0);
  });
});
