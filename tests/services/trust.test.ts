import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let trust: any;

const landlordRows = new Map<string, any>();
const trustAccountRows = new Map<string, any>();
const ledgerRows = new Map<string, any>();
const tenantRows = new Map<string, any>();
const leaseTenantRows: any[] = [];
const auditCalls: any[] = [];

const originals: Record<string, any> = {};
const ctx = { orgId: 'org-1', userId: 'user-1', role: 'ADMIN' as const };

function restoreAll() {
  for (const [path, fn] of Object.entries(originals)) {
    const [ns, method] = path.split('.');
    (db as any)[ns][method] = fn;
  }
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  const save = (path: string, fn: any) => {
    originals[path] = fn;
  };

  save('landlord.findFirst', db.landlord.findFirst);
  save('trustAccount.findUnique', db.trustAccount.findUnique);
  save('trustAccount.create', db.trustAccount.create);
  save('trustAccount.findMany', db.trustAccount.findMany);
  save('trustLedgerEntry.create', db.trustLedgerEntry.create);
  save('trustLedgerEntry.findMany', db.trustLedgerEntry.findMany);
  save('trustLedgerEntry.aggregate', db.trustLedgerEntry.aggregate);
  save('tenant.findFirst', db.tenant.findFirst);
  save('leaseTenant.findFirst', db.leaseTenant.findFirst);
  save('auditLog.create', db.auditLog.create);
  save('orgIntegration.findUnique', db.orgIntegration.findUnique);
  save('trustLedgerEntry.update', db.trustLedgerEntry.update);
  save('$transaction', db.$transaction);

  db.orgIntegration.findUnique = async () => null;
  db.trustLedgerEntry.update = async ({ where, data }: any) => {
    const row = ledgerRows.get(where.id);
    const next = { ...row, ...data };
    ledgerRows.set(where.id, next);
    return next;
  };

  db.landlord.findFirst = async ({ where }: any) => {
    const row = landlordRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.trustAccount.findUnique = async ({ where }: any) => {
    const k = where.orgId_landlordId
      ? `${where.orgId_landlordId.orgId}:${where.orgId_landlordId.landlordId}`
      : where.id;
    return trustAccountRows.get(k) ?? null;
  };
  db.trustAccount.create = async ({ data }: any) => {
    const id = `ta-${trustAccountRows.size + 1}`;
    const row = { id, openedAt: new Date(), ...data };
    trustAccountRows.set(id, row);
    trustAccountRows.set(`${data.orgId}:${data.landlordId}`, row);
    return row;
  };
  db.trustAccount.findMany = async ({ where, include }: any) => {
    const seen = new Set<string>();
    const all: any[] = [];
    for (const a of trustAccountRows.values()) {
      if (typeof a.id !== 'string' || !a.id.startsWith('ta-')) continue;
      if (a.orgId !== where.orgId) continue;
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      all.push(a);
    }
    if (include?.landlord) {
      return all.map((a) => ({ ...a, landlord: landlordRows.get(a.landlordId) }));
    }
    return all;
  };
  db.trustLedgerEntry.create = async ({ data }: any) => {
    const id = `le-${ledgerRows.size + 1}`;
    const row = { id, createdAt: new Date(), ...data };
    ledgerRows.set(id, row);
    return row;
  };
  db.trustLedgerEntry.findMany = async ({ where }: any) => {
    return [...ledgerRows.values()].filter((e) => {
      if (where.landlordId && e.landlordId !== where.landlordId) return false;
      if (where.tenantId && e.tenantId !== where.tenantId) return false;
      if (where.trustAccount?.orgId) {
        const acc = trustAccountRows.get(e.trustAccountId);
        if (!acc || acc.orgId !== where.trustAccount.orgId) return false;
      }
      return true;
    });
  };
  db.trustLedgerEntry.aggregate = async ({ where, _sum }: any) => {
    const matching = [...ledgerRows.values()].filter(
      (e) => e.trustAccountId === where.trustAccountId,
    );
    const total = matching.reduce((acc, e) => acc + e.amountCents, 0);
    return { _sum: { amountCents: total } };
  };
  db.tenant.findFirst = async ({ where }: any) => {
    const row = tenantRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.leaseTenant.findFirst = async ({ where, include }: any) => {
    const link = leaseTenantRows.find((lt) => lt.tenantId === where.tenantId);
    if (!link) return null;
    return link;
  };
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };
  db.$transaction = async (arg: any) => {
    if (typeof arg === 'function') return arg(db);
    return Promise.all(arg);
  };

  trust = (await import('@/lib/services/trust')) as any;
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  landlordRows.clear();
  trustAccountRows.clear();
  ledgerRows.clear();
  tenantRows.clear();
  leaseTenantRows.length = 0;
  auditCalls.length = 0;
});

function seedLandlord(id: string, orgId = 'org-1', name = `Landlord ${id}`) {
  landlordRows.set(id, { id, orgId, name, archivedAt: null });
}

describe('trust service (per-landlord)', () => {
  it('isolates ledger balances per landlord', async () => {
    seedLandlord('ll-1');
    seedLandlord('ll-2');

    await trust.recordManualLedgerEntry(ctx, 'll-1', {
      type: 'RECEIPT',
      amountCents: 1000,
    });
    await trust.recordManualLedgerEntry(ctx, 'll-2', {
      type: 'RECEIPT',
      amountCents: 2500,
    });

    const b1 = await trust.getTrustBalance(ctx, 'll-1');
    const b2 = await trust.getTrustBalance(ctx, 'll-2');
    assert.equal(b1.totalCents, 1000);
    assert.equal(b2.totalCents, 2500);
  });

  it('rolls up portfolio balance with per-landlord breakdown', async () => {
    seedLandlord('ll-1', 'org-1', 'Alpha');
    seedLandlord('ll-2', 'org-1', 'Beta');
    await trust.recordManualLedgerEntry(ctx, 'll-1', { type: 'RECEIPT', amountCents: 1000 });
    await trust.recordManualLedgerEntry(ctx, 'll-2', { type: 'RECEIPT', amountCents: 500 });
    await trust.recordManualLedgerEntry(ctx, 'll-1', { type: 'DISBURSEMENT', amountCents: -200 });

    const portfolio = await trust.getPortfolioTrustBalance(ctx);
    assert.equal(portfolio.totalCents, 1300);
    assert.equal(portfolio.perLandlord.length, 2);
    const alpha = portfolio.perLandlord.find((p: any) => p.landlordId === 'll-1');
    assert.equal(alpha.totalCents, 800);
  });

  it('refuses entries when landlord is not in org', async () => {
    seedLandlord('ll-1', 'other-org');
    await assert.rejects(
      () => trust.recordManualLedgerEntry(ctx, 'll-1', { type: 'RECEIPT', amountCents: 100 }),
      /Landlord not found/,
    );
  });

  it('disburseToLandlord writes a negative DISBURSEMENT entry', async () => {
    seedLandlord('ll-1');
    await trust.recordManualLedgerEntry(ctx, 'll-1', { type: 'RECEIPT', amountCents: 5000 });
    const entry = await trust.disburseToLandlord(ctx, {
      landlordId: 'll-1',
      amountCents: 1500,
      note: 'Monthly payout',
    });
    assert.equal(entry.type, 'DISBURSEMENT');
    assert.equal(entry.amountCents, -1500);
    const balance = await trust.getTrustBalance(ctx, 'll-1');
    assert.equal(balance.totalCents, 3500);
  });
});
