import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let debicheck: any;

const leaseRows = new Map<string, any>();
const mandateRows = new Map<string, any>();
const invoiceRows = new Map<string, any>();
const notificationRows: any[] = [];
const auditCalls: any[] = [];
const receiptRows = new Map<string, any>();

const originals: Record<string, any> = {};
function save(path: string, fn: any) { originals[path] = fn; }
function restoreAll() {
  for (const [path, fn] of Object.entries(originals)) {
    const [ns, method] = path.split('.');
    (db as any)[ns][method] = fn;
  }
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  save('lease.findFirst', db.lease.findFirst);
  save('debiCheckMandate.findUnique', db.debiCheckMandate.findUnique);
  save('debiCheckMandate.findFirst', db.debiCheckMandate.findFirst);
  save('debiCheckMandate.upsert', db.debiCheckMandate.upsert);
  save('debiCheckMandate.update', db.debiCheckMandate.update);
  save('invoice.findFirst', db.invoice.findFirst);
  save('invoice.update', db.invoice.update);
  save('notification.create', db.notification.create);
  save('auditLog.create', db.auditLog.create);
  save('paymentReceipt.create', db.paymentReceipt.create);
  save('orgIntegration.findUnique', db.orgIntegration.findUnique);
  save('$transaction', db.$transaction);

  db.lease.findFirst = async ({ where }: any) => {
    const row = leaseRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.debiCheckMandate.findUnique = async ({ where }: any) => mandateRows.get(where.leaseId) ?? null;
  db.debiCheckMandate.findFirst = async ({ where }: any) => {
    for (const row of mandateRows.values()) {
      if (where.id && row.id !== where.id) continue;
      if (where.orgId && row.orgId !== where.orgId) continue;
      if (where.mandateExternalId && row.mandateExternalId !== where.mandateExternalId) continue;
      return row;
    }
    return null;
  };
  db.debiCheckMandate.upsert = async ({ where, create, update }: any) => {
    const existing = mandateRows.get(where.leaseId);
    if (existing) {
      const next = { ...existing, ...update, updatedAt: new Date() };
      mandateRows.set(where.leaseId, next);
      return next;
    }
    const row = {
      id: `mdt-${mandateRows.size + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...create,
    };
    mandateRows.set(where.leaseId, row);
    return row;
  };
  db.debiCheckMandate.update = async ({ where, data }: any) => {
    for (const [k, v] of mandateRows) {
      if (v.id === where.id) {
        const next = { ...v, ...data };
        mandateRows.set(k, next);
        return next;
      }
    }
    return null;
  };
  db.invoice.findFirst = async ({ where }: any) => {
    const row = invoiceRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.invoice.update = async ({ where, data }: any) => {
    const row = invoiceRows.get(where.id);
    const next = { ...row, ...data };
    invoiceRows.set(where.id, next);
    return next;
  };
  db.notification.create = async ({ data }: any) => {
    notificationRows.push(data);
    return { id: `n-${notificationRows.length}`, ...data };
  };
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };
  db.paymentReceipt.create = async ({ data }: any) => {
    const id = `r-${receiptRows.size + 1}`;
    const row = { id, ...data, createdAt: new Date() };
    receiptRows.set(id, row);
    return row;
  };
  const { encrypt } = (await import('@/lib/crypto')) as any;
  const cipher = encrypt('tok');
  db.orgIntegration.findUnique = async ({ where }: any) => ({
    id: 'oi-1',
    orgId: where.orgId_provider.orgId,
    provider: where.orgId_provider.provider,
    status: 'CONNECTED',
    accessTokenCipher: cipher,
    refreshTokenCipher: null,
    tokenExpiresAt: null,
  });
  db.$transaction = async (arg: any) => (typeof arg === 'function' ? arg(db) : Promise.all(arg));

  debicheck = await import('@/lib/services/debicheck');
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  leaseRows.clear();
  mandateRows.clear();
  invoiceRows.clear();
  notificationRows.length = 0;
  auditCalls.length = 0;
  receiptRows.clear();
});

const ctx = { orgId: 'org-1', userId: 'u-1', role: 'PROPERTY_MANAGER' as const };

describe('debicheck service', () => {
  it('createMandateRequest creates a PENDING_SIGNATURE mandate', async () => {
    leaseRows.set('lease-1', {
      id: 'lease-1',
      orgId: 'org-1',
      tenants: [{ tenantId: 't-1', isPrimary: true }],
    });
    const mandate = await debicheck.createMandateRequest(ctx, 'lease-1', 1500000);
    assert.equal(mandate.status, 'PENDING_SIGNATURE');
    assert.equal(mandate.upperCapCents, 1500000);
    assert.equal(mandate.tenantId, 't-1');
  });

  it('submitMonthlyCollection refuses amounts above the cap', async () => {
    leaseRows.set('lease-1', {
      id: 'lease-1',
      orgId: 'org-1',
      tenants: [{ tenantId: 't-1', isPrimary: true }],
    });
    const m = await debicheck.createMandateRequest(ctx, 'lease-1', 1000000);
    // Flip to ACTIVE manually (webhook would do this in real flow).
    const row = mandateRows.get('lease-1');
    mandateRows.set('lease-1', { ...row, status: 'ACTIVE' });

    await assert.rejects(
      () => debicheck.submitMonthlyCollection(ctx, m.id, 2000000),
      /exceeds upper cap/,
    );
  });

  it('retryUnpaidCollection flips invoice to OVERDUE when payment still unpaid', async () => {
    leaseRows.set('lease-1', {
      id: 'lease-1',
      orgId: 'org-1',
      tenants: [{ tenantId: 't-1', isPrimary: true }],
    });
    const m = await debicheck.createMandateRequest(ctx, 'lease-1', 1000000);
    // Force ACTIVE status.
    const mRow = mandateRows.get('lease-1');
    mandateRows.set('lease-1', { ...mRow, status: 'ACTIVE' });

    invoiceRows.set('inv-1', {
      id: 'inv-1',
      orgId: 'org-1',
      leaseId: 'lease-1',
      status: 'DUE',
      amountCents: 50000,
      totalCents: 50000,
    });

    await debicheck.retryUnpaidCollection(ctx, m.id, 'inv-1');

    const updated = invoiceRows.get('inv-1');
    assert.equal(updated.status, 'OVERDUE');
    assert.equal(notificationRows.length, 1);
    assert.equal(notificationRows[0].type, 'DEBICHECK_RETRY_FAILED');
  });
});
