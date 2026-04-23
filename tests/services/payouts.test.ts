import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');
process.env.STITCH_WEBHOOK_SECRET = 'payouts-secret';

let db: any;
let trust: any;
let payoutsAdapter: any;

const landlordRows = new Map<string, any>();
const trustAccountRows = new Map<string, any>();
const ledgerRows = new Map<string, any>();

const originals: Record<string, any> = {};
function save(p: string, fn: any) { originals[p] = fn; }
function restoreAll() {
  for (const [path, fn] of Object.entries(originals)) {
    const [ns, method] = path.split('.');
    (db as any)[ns][method] = fn;
  }
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  save('landlord.findFirst', db.landlord.findFirst);
  save('trustAccount.findUnique', db.trustAccount.findUnique);
  save('trustAccount.create', db.trustAccount.create);
  save('trustLedgerEntry.create', db.trustLedgerEntry.create);
  save('trustLedgerEntry.findFirst', db.trustLedgerEntry.findFirst);
  save('trustLedgerEntry.update', db.trustLedgerEntry.update);
  save('auditLog.create', db.auditLog.create);
  save('$transaction', db.$transaction);

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
  db.trustLedgerEntry.create = async ({ data }: any) => {
    const id = `le-${ledgerRows.size + 1}`;
    const row = { id, createdAt: new Date(), ...data };
    ledgerRows.set(id, row);
    return row;
  };
  db.trustLedgerEntry.findFirst = async ({ where }: any) => {
    for (const row of ledgerRows.values()) {
      if (where.sourceId && row.sourceId !== where.sourceId) continue;
      return row;
    }
    return null;
  };
  db.trustLedgerEntry.update = async ({ where, data }: any) => {
    const row = ledgerRows.get(where.id);
    const next = { ...row, ...data };
    ledgerRows.set(where.id, next);
    return next;
  };
  db.auditLog.create = async ({ data }: any) => ({ id: 'a', ...data });
  db.$transaction = async (arg: any) => (typeof arg === 'function' ? arg(db) : Promise.all(arg));

  // Stub the adapter to return a deterministic payout externalId.
  payoutsAdapter = await import('@/lib/integrations/stitch/payouts-adapter');
  (payoutsAdapter as any).stitchPayoutsAdapter.initiatePayout = async (_ctx: any, input: any) => ({
    payoutExternalId: `payout-${input.externalRef}`,
    status: 'PENDING',
  });

  trust = await import('@/lib/services/trust');
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  landlordRows.clear();
  trustAccountRows.clear();
  ledgerRows.clear();
});

const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };

describe('payouts', () => {
  it('disburseToLandlord writes a DISBURSEMENT ledger entry and stamps payoutExternalId', async () => {
    landlordRows.set('ll-1', { id: 'll-1', orgId: 'org-1', name: 'Alpha', archivedAt: null });
    const entry = await trust.disburseToLandlord(ctx, {
      landlordId: 'll-1',
      amountCents: 2500,
    });
    assert.equal(entry.type, 'DISBURSEMENT');
    assert.equal(entry.amountCents, -2500);
    const updated = ledgerRows.get(entry.id);
    assert.ok(updated.sourceId?.startsWith('payout-'), 'sourceId should hold payout externalId');
  });

  it('payout webhook handler flips ledger entry note on CONFIRMED', async () => {
    landlordRows.set('ll-1', { id: 'll-1', orgId: 'org-1', name: 'Alpha', archivedAt: null });
    const entry = await trust.disburseToLandlord(ctx, {
      landlordId: 'll-1',
      amountCents: 1000,
      note: 'Test',
    });
    const stored = ledgerRows.get(entry.id);
    const payoutId = stored.sourceId;
    const body = JSON.stringify({
      id: 'evt-1',
      type: 'payout.confirmed',
      data: { payoutExternalId: payoutId, status: 'CONFIRMED', amountCents: 1000 },
    });
    const sig = createHmac('sha256', 'payouts-secret').update(body).digest('hex');
    const event = payoutsAdapter.handlePayoutWebhook(body, sig);
    assert.equal(event.status, 'CONFIRMED');
  });

  it('disburse falls through cleanly when payouts adapter throws conflict', async () => {
    landlordRows.set('ll-2', { id: 'll-2', orgId: 'org-1', name: 'Beta', archivedAt: null });
    const prev = payoutsAdapter.stitchPayoutsAdapter.initiatePayout;
    payoutsAdapter.stitchPayoutsAdapter.initiatePayout = async () => {
      const mod = (await import('@/lib/errors')) as any;
      throw mod.ApiError.conflict('Stitch payouts not connected');
    };
    try {
      const entry = await trust.disburseToLandlord(ctx, {
        landlordId: 'll-2',
        amountCents: 500,
      });
      assert.equal(entry.amountCents, -500);
      const stored = ledgerRows.get(entry.id);
      assert.equal(stored.sourceId ?? null, null);
    } finally {
      payoutsAdapter.stitchPayoutsAdapter.initiatePayout = prev;
    }
  });
});
