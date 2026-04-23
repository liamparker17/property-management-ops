import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let generateBillingRun: any;
let publishBillingRun: any;
let rebuildInvoiceTotals: any;

const billingRunRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const invoiceRows = new Map<string, any>();
const lineItemRows = new Map<string, any>();
const orgFeatureRows = new Map<string, any>();
const meterRows = new Map<string, any>();
const notifications: any[] = [];
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

  save('billingRun.findUnique', db.billingRun.findUnique);
  save('billingRun.create', db.billingRun.create);
  save('billingRun.update', db.billingRun.update);
  save('billingRun.findFirst', db.billingRun.findFirst);
  save('billingRun.findMany', db.billingRun.findMany);
  save('lease.findMany', db.lease.findMany);
  save('lease.findFirst', db.lease.findFirst);
  save('invoice.findUnique', db.invoice.findUnique);
  save('invoice.findFirst', db.invoice.findFirst);
  save('invoice.create', db.invoice.create);
  save('invoice.update', db.invoice.update);
  save('invoiceLineItem.create', db.invoiceLineItem.create);
  save('invoiceLineItem.findMany', db.invoiceLineItem.findMany);
  save('invoiceLineItem.deleteMany', db.invoiceLineItem.deleteMany);
  save('orgFeature.findUnique', db.orgFeature.findUnique);
  save('meter.findMany', db.meter.findMany);
  save('notification.create', db.notification.create);
  save('auditLog.create', db.auditLog.create);
  save('$transaction', db.$transaction);

  db.billingRun.findUnique = async ({ where }: any) => {
    if (where.orgId_periodStart) {
      const key = `${where.orgId_periodStart.orgId}:${where.orgId_periodStart.periodStart.toISOString()}`;
      return billingRunRows.get(key) ?? null;
    }
    return billingRunRows.get(where.id) ?? null;
  };
  db.billingRun.create = async ({ data }: any) => {
    const id = `run-${billingRunRows.size + 1}`;
    const row = { id, ...data, createdAt: new Date() };
    billingRunRows.set(id, row);
    billingRunRows.set(`${data.orgId}:${data.periodStart.toISOString()}`, row);
    return row;
  };
  db.billingRun.update = async ({ where, data }: any) => {
    const row = billingRunRows.get(where.id);
    Object.assign(row, data);
    return row;
  };
  db.billingRun.findFirst = async ({ where }: any) => {
    const run = billingRunRows.get(where.id);
    if (!run) return null;
    if (where.orgId && run.orgId !== where.orgId) return null;
    run.invoices = [...invoiceRows.values()]
      .filter((inv) => inv.billingRunId === run.id)
      .map((inv) => ({
        ...inv,
        lineItems: [...lineItemRows.values()].filter((l) => l.invoiceId === inv.id),
        lease: leaseRows.get(inv.leaseId)
          ? {
              id: inv.leaseId,
              tenants: [
                { tenant: { id: 'tenant-1', userId: 'user-tenant-1' } },
              ],
            }
          : null,
      }));
    return run;
  };
  db.billingRun.findMany = async ({ where }: any) =>
    [...billingRunRows.values()].filter(
      (r) => typeof r.id === 'string' && r.id.startsWith('run-') && r.orgId === where.orgId,
    );

  db.lease.findMany = async ({ where }: any) =>
    [...leaseRows.values()].filter((l) => l.orgId === where.orgId);
  db.lease.findFirst = async ({ where }: any) => {
    const row = leaseRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };

  db.invoice.findUnique = async ({ where }: any) => {
    if (where.leaseId_periodStart) {
      return (
        [...invoiceRows.values()].find(
          (i) =>
            i.leaseId === where.leaseId_periodStart.leaseId &&
            i.periodStart.getTime() === where.leaseId_periodStart.periodStart.getTime(),
        ) ?? null
      );
    }
    return invoiceRows.get(where.id) ?? null;
  };
  db.invoice.findFirst = async ({ where }: any) => {
    const row = invoiceRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.invoice.create = async ({ data }: any) => {
    const id = `inv-${invoiceRows.size + 1}`;
    const row = { id, ...data, updatedAt: new Date(), createdAt: new Date() };
    invoiceRows.set(id, row);
    return row;
  };
  db.invoice.update = async ({ where, data }: any) => {
    const row = invoiceRows.get(where.id);
    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  };

  db.invoiceLineItem.create = async ({ data }: any) => {
    const id = `li-${lineItemRows.size + 1}`;
    const row = { id, createdAt: new Date(), estimated: false, ...data };
    lineItemRows.set(id, row);
    return row;
  };
  db.invoiceLineItem.findMany = async ({ where }: any) =>
    [...lineItemRows.values()].filter((l) => l.invoiceId === where.invoiceId);
  db.invoiceLineItem.deleteMany = async ({ where }: any) => {
    for (const [id, row] of lineItemRows) {
      if (row.invoiceId !== where.invoiceId) continue;
      if (where.sourceType?.in && !where.sourceType.in.includes(row.sourceType)) continue;
      lineItemRows.delete(id);
    }
    return { count: 0 };
  };

  db.orgFeature.findUnique = async ({ where }: any) => {
    const key = `${where.orgId_key.orgId}:${where.orgId_key.key}`;
    return orgFeatureRows.get(key) ?? null;
  };
  db.meter.findMany = async ({ where }: any) =>
    [...meterRows.values()].filter((m) => m.orgId === where.orgId && m.unitId === where.unitId);
  db.notification.create = async ({ data }: any) => {
    notifications.push(data);
    return { id: `n-${notifications.length}`, ...data };
  };
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };
  db.$transaction = async (arg: any) => {
    if (typeof arg === 'function') return arg(db);
    return Promise.all(arg);
  };

  const mod = (await import('@/lib/services/billing')) as any;
  generateBillingRun = mod.generateBillingRun;
  publishBillingRun = mod.publishBillingRun;
  rebuildInvoiceTotals = mod.rebuildInvoiceTotals;
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  billingRunRows.clear();
  leaseRows.clear();
  invoiceRows.clear();
  lineItemRows.clear();
  orgFeatureRows.clear();
  meterRows.clear();
  notifications.length = 0;
  auditCalls.length = 0;
});

function seedLease(id: string, rentCents: number) {
  leaseRows.set(id, {
    id,
    orgId: 'org-1',
    rentAmountCents: rentCents,
    paymentDueDay: 1,
    state: 'ACTIVE',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    unitId: 'unit-1',
    unit: { propertyId: 'property-1', label: 'A', property: { name: 'Prop' } },
  });
}

describe('billing service', () => {
  it('generates a run with a rent line, rebuilds totals, and publishes', async () => {
    seedLease('lease-1', 1000000);
    const period = new Date('2026-04-01T00:00:00.000Z');
    const run = await generateBillingRun(ctx, period);
    assert.equal(run.status, 'READY');

    const invoice = [...invoiceRows.values()][0];
    assert.equal(invoice.totalCents, 1000000);
    assert.equal(invoice.amountCents, 1000000);

    const published = await publishBillingRun(ctx, run.id);
    assert.equal(published.status, 'PUBLISHED');
    const updatedInvoice = invoiceRows.get(invoice.id);
    assert.equal(updatedInvoice.status, 'DUE');
    assert.equal(notifications.length, 1);
  });

  it('is idempotent: re-running for the same period reuses the run', async () => {
    seedLease('lease-1', 900000);
    const period = new Date('2026-05-01T00:00:00.000Z');
    const run1 = await generateBillingRun(ctx, period);
    const run2 = await generateBillingRun(ctx, period);
    assert.equal(run1.id, run2.id);
    const rentLines = [...lineItemRows.values()].filter((l) => l.kind === 'RENT');
    assert.equal(rentLines.length, 1);
  });

  it('refuses to publish estimated lines without the allowEstimates override', async () => {
    seedLease('lease-1', 500000);
    const period = new Date('2026-06-01T00:00:00.000Z');
    const run = await generateBillingRun(ctx, period);

    const inv = [...invoiceRows.values()][0];
    await db.invoiceLineItem.create({
      data: {
        invoiceId: inv.id,
        kind: 'UTILITY_WATER',
        description: 'water usage',
        amountCents: 12345,
        estimated: true,
        sourceType: 'MeterReading',
      },
    });
    await rebuildInvoiceTotals(inv.id);

    await assert.rejects(() => publishBillingRun(ctx, run.id), /estimated/i);

    orgFeatureRows.set('org-1:UTILITIES_BILLING', {
      enabled: true,
      config: { allowEstimates: true },
    });
    const published = await publishBillingRun(ctx, run.id);
    assert.equal(published.status, 'PUBLISHED');
  });
});
