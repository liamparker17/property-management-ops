import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');
process.env.STITCH_WEBHOOK_SECRET = 'test-secret';

let db: any;
let adapter: any;
let service: any;

const orgIntegrationRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const invoiceRows = new Map<string, any>();
const tenantRows = new Map<string, any>();
const receiptRows = new Map<string, any>();

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

  save('orgIntegration.findFirst', db.orgIntegration.findFirst);
  save('orgIntegration.findUnique', db.orgIntegration.findUnique);
  save('lease.findFirst', db.lease.findFirst);
  save('invoice.findFirst', db.invoice.findFirst);
  save('tenant.findFirst', db.tenant.findFirst);
  save('paymentReceipt.findFirst', db.paymentReceipt.findFirst);
  save('paymentReceipt.create', db.paymentReceipt.create);
  save('auditLog.create', db.auditLog.create);
  save('$transaction', db.$transaction);

  db.orgIntegration.findFirst = async ({ where }: any) => {
    for (const row of orgIntegrationRows.values()) {
      if (where.provider && row.provider !== where.provider) continue;
      if (where.status && row.status !== where.status) continue;
      return row;
    }
    return null;
  };
  db.orgIntegration.findUnique = async ({ where }: any) => {
    const k = where.orgId_provider
      ? `${where.orgId_provider.orgId}:${where.orgId_provider.provider}`
      : where.id;
    return orgIntegrationRows.get(k) ?? null;
  };
  db.lease.findFirst = async ({ where }: any) => {
    for (const row of leaseRows.values()) {
      if (where.id && row.id !== where.id) continue;
      if (where.orgId && row.orgId !== where.orgId) continue;
      return row;
    }
    return null;
  };
  db.invoice.findFirst = async ({ where }: any) => {
    for (const row of invoiceRows.values()) {
      if (where.id && row.id !== where.id) continue;
      if (where.orgId && row.orgId !== where.orgId) continue;
      return row;
    }
    return null;
  };
  db.tenant.findFirst = async ({ where }: any) => {
    for (const row of tenantRows.values()) {
      if (where.id && row.id !== where.id) continue;
      if (where.userId && row.userId !== where.userId) continue;
      if (where.orgId && row.orgId !== where.orgId) continue;
      return row;
    }
    return null;
  };
  db.paymentReceipt.findFirst = async ({ where }: any) => {
    for (const row of receiptRows.values()) {
      if (where.orgId && row.orgId !== where.orgId) continue;
      if (where.externalRef && row.externalRef !== where.externalRef) continue;
      if (where.source && row.source !== where.source) continue;
      if (where.id && row.id !== where.id) continue;
      return row;
    }
    return null;
  };
  db.paymentReceipt.create = async ({ data }: any) => {
    const id = `r-${receiptRows.size + 1}`;
    const row = { id, createdAt: new Date(), ...data };
    receiptRows.set(id, row);
    return row;
  };
  db.auditLog.create = async ({ data }: any) => ({ id: 'a', ...data });
  db.$transaction = async (arg: any) => (typeof arg === 'function' ? arg(db) : Promise.all(arg));

  adapter = await import('@/lib/integrations/stitch/payments-adapter');
  service = await import('@/lib/services/stitch-payments');
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  orgIntegrationRows.clear();
  leaseRows.clear();
  invoiceRows.clear();
  tenantRows.clear();
  receiptRows.clear();
});

function connectStitch(orgId = 'org-1') {
  // Only isStitchPaymentsConnectedAnywhere + resolveOrgIdFromEvent need this row; tokens not required here because
  // createCheckoutSession is not called in webhook tests.
  orgIntegrationRows.set(`${orgId}:STITCH_PAYMENTS`, {
    id: 'oi-1',
    orgId,
    provider: 'STITCH_PAYMENTS',
    status: 'CONNECTED',
  });
}

function signBody(body: string) {
  return createHmac('sha256', 'test-secret').update(body).digest('hex');
}

describe('stitch webhook signature', () => {
  it('verifies a correct signature', () => {
    const body = '{"id":"evt_1","type":"payment.confirmed"}';
    const sig = signBody(body);
    assert.equal(adapter.verifyWebhookSignature(body, sig), true);
  });

  it('rejects a tampered body', () => {
    const body = '{"id":"evt_1","type":"payment.confirmed"}';
    const sig = signBody(body);
    assert.equal(adapter.verifyWebhookSignature(body + 'tamper', sig), false);
  });

  it('returns false when secret env is missing', () => {
    const prev = process.env.STITCH_WEBHOOK_SECRET;
    delete process.env.STITCH_WEBHOOK_SECRET;
    try {
      assert.equal(adapter.verifyWebhookSignature('x', 'y'), false);
    } finally {
      process.env.STITCH_WEBHOOK_SECRET = prev;
    }
  });
});

describe('stitch-payments service', () => {
  it('returns a redirectUrl from createCheckoutSession stub', async () => {
    const { encrypt } = await import('@/lib/crypto');
    orgIntegrationRows.set('org-1:STITCH_PAYMENTS', {
      id: 'oi-1',
      orgId: 'org-1',
      provider: 'STITCH_PAYMENTS',
      status: 'CONNECTED',
      accessTokenCipher: encrypt('tok'),
    });
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'TENANT' as const };
    const session = await adapter.createCheckoutSession(ctx, {
      invoiceId: 'inv-1',
      amountCents: 1000,
      tenantId: 't-1',
      leaseId: 'lease-1',
    });
    assert.ok(session.redirectUrl.includes('stitch'));
    assert.ok(session.redirectUrl.includes('inv-1'));
  });

  it('handles a payment.confirmed webhook gracefully when no org is connected', async () => {
    const body = JSON.stringify({
      id: 'evt_2',
      type: 'payment.confirmed',
      data: { amountCents: 1000 },
    });
    const sig = signBody(body);
    const result = await service.handleStitchWebhook(body, sig);
    assert.equal(result.handled, false);
  });

  it('ignores non-confirmed event types', async () => {
    connectStitch();
    const body = JSON.stringify({ id: 'evt_3', type: 'payment.failed', data: {} });
    const sig = signBody(body);
    const result = await service.handleStitchWebhook(body, sig);
    assert.equal(result.handled, false);
  });
});
