import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let payments: any;

const landlordRows = new Map<string, any>();
const trustAccountRows = new Map<string, any>();
const ledgerRows = new Map<string, any>();
const tenantRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const leaseTenantRows: any[] = [];
const propertyRows = new Map<string, any>();
const unitRows = new Map<string, any>();
const invoiceRows = new Map<string, any>();
const lineItemRows = new Map<string, any>();
const allocationRows = new Map<string, any>();
const receiptRows = new Map<string, any>();
const auditCalls: any[] = [];

const originals: Record<string, any> = {};

function ctxWithRole(role: 'ADMIN' | 'PROPERTY_MANAGER' | 'FINANCE') {
  return { orgId: 'org-1', userId: `user-${role}`, role };
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

  const save = (path: string, fn: any) => {
    originals[path] = fn;
  };

  save('landlord.findFirst', db.landlord.findFirst);
  save('trustAccount.findUnique', db.trustAccount.findUnique);
  save('trustAccount.create', db.trustAccount.create);
  save('trustLedgerEntry.create', db.trustLedgerEntry.create);
  save('trustLedgerEntry.findMany', db.trustLedgerEntry.findMany);
  save('paymentReceipt.create', db.paymentReceipt.create);
  save('paymentReceipt.findFirst', db.paymentReceipt.findFirst);
  save('paymentReceipt.delete', db.paymentReceipt.delete);
  save('paymentReceipt.findMany', db.paymentReceipt.findMany);
  save('allocation.create', db.allocation.create);
  save('allocation.findUnique', db.allocation.findUnique);
  save('allocation.update', db.allocation.update);
  save('lease.findFirst', db.lease.findFirst);
  save('leaseTenant.findFirst', db.leaseTenant.findFirst);
  save('invoice.findMany', db.invoice.findMany);
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

  db.paymentReceipt.create = async ({ data }: any) => {
    const id = `r-${receiptRows.size + 1}`;
    const row = { id, createdAt: new Date(), ...data };
    receiptRows.set(id, row);
    return row;
  };
  db.paymentReceipt.findFirst = async ({ where, include }: any) => {
    const row = where.id ? receiptRows.get(where.id) : null;
    let candidate = row;
    if (!candidate && where.externalRef) {
      candidate =
        [...receiptRows.values()].find(
          (r) =>
            r.orgId === where.orgId &&
            r.externalRef === where.externalRef &&
            (where.source ? r.source === where.source : true),
        ) ?? null;
    }
    if (!candidate) return null;
    if (where.orgId && candidate.orgId !== where.orgId) return null;
    if (include?.allocations) {
      const allocs = [...allocationRows.values()].filter((a) => a.receiptId === candidate!.id);
      return { ...candidate, allocations: allocs };
    }
    return candidate;
  };
  db.paymentReceipt.delete = async ({ where }: any) => {
    receiptRows.delete(where.id);
    return { id: where.id };
  };
  db.paymentReceipt.findMany = async ({ where }: any) =>
    [...receiptRows.values()].filter((r) => r.orgId === where.orgId);

  db.allocation.create = async ({ data }: any) => {
    const id = `al-${allocationRows.size + 1}`;
    const row = { id, createdAt: new Date(), reversedAt: null, reversedById: null, ...data };
    allocationRows.set(id, row);
    return row;
  };
  db.allocation.findUnique = async ({ where, include }: any) => {
    const row = allocationRows.get(where.id);
    if (!row) return null;
    if (include?.receipt) return { ...row, receipt: receiptRows.get(row.receiptId) };
    return row;
  };
  db.allocation.update = async ({ where, data }: any) => {
    const row = allocationRows.get(where.id);
    Object.assign(row, data);
    return row;
  };

  db.lease.findFirst = async ({ where, include }: any) => {
    const row = leaseRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    if (include?.unit?.include?.property) {
      const unit = unitRows.get(row.unitId);
      const property = propertyRows.get(unit?.propertyId);
      return { ...row, unit: { ...unit, property } };
    }
    return row;
  };
  db.leaseTenant.findFirst = async ({ where, include }: any) => {
    const link = leaseTenantRows.find((lt) => {
      if (lt.tenantId !== where.tenantId) return false;
      if (where.lease?.state?.in) {
        const lease = leaseRows.get(lt.leaseId);
        if (!lease || !where.lease.state.in.includes(lease.state)) return false;
      }
      if (where.lease?.orgId) {
        const lease = leaseRows.get(lt.leaseId);
        if (!lease || lease.orgId !== where.lease.orgId) return false;
      }
      return true;
    });
    if (!link) return null;
    const lease = leaseRows.get(link.leaseId);
    const unit = unitRows.get(lease?.unitId);
    const property = propertyRows.get(unit?.propertyId);
    return { ...link, lease: { ...lease, unit: { ...unit, property } } };
  };
  db.invoice.findMany = async ({ where, include }: any) => {
    let rows = [...invoiceRows.values()];
    if (where.lease?.id) rows = rows.filter((i) => i.leaseId === where.lease.id);
    if (where.lease?.orgId) {
      rows = rows.filter((i) => {
        const l = leaseRows.get(i.leaseId);
        return l && l.orgId === where.lease.orgId;
      });
    }
    if (where.lease?.tenants?.some?.tenantId) {
      const tid = where.lease.tenants.some.tenantId;
      const leaseIds = leaseTenantRows.filter((lt) => lt.tenantId === tid).map((lt) => lt.leaseId);
      rows = rows.filter((i) => leaseIds.includes(i.leaseId));
    }
    if (where.status?.in) rows = rows.filter((i) => where.status.in.includes(i.status));
    rows = rows.slice().sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
    if (include?.lineItems) {
      return rows.map((inv) => ({
        ...inv,
        lineItems: [...lineItemRows.values()]
          .filter((li) => li.invoiceId === inv.id)
          .map((li) => ({
            ...li,
            allocations: [...allocationRows.values()].filter((a) => a.invoiceLineItemId === li.id),
          })),
      }));
    }
    return rows;
  };
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };
  db.$transaction = async (arg: any) => {
    if (typeof arg === 'function') return arg(db);
    return Promise.all(arg);
  };

  payments = (await import('@/lib/services/payments')) as any;
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
  leaseRows.clear();
  leaseTenantRows.length = 0;
  propertyRows.clear();
  unitRows.clear();
  invoiceRows.clear();
  lineItemRows.clear();
  allocationRows.clear();
  receiptRows.clear();
  auditCalls.length = 0;
});

function seedFixtures() {
  landlordRows.set('ll-1', { id: 'll-1', orgId: 'org-1', name: 'Landlord 1', archivedAt: null });
  propertyRows.set('p-1', { id: 'p-1', orgId: 'org-1', landlordId: 'll-1' });
  unitRows.set('u-1', { id: 'u-1', orgId: 'org-1', propertyId: 'p-1' });
  tenantRows.set('t-1', { id: 't-1', orgId: 'org-1' });
  leaseRows.set('lease-1', {
    id: 'lease-1',
    orgId: 'org-1',
    unitId: 'u-1',
    state: 'ACTIVE',
  });
  leaseTenantRows.push({ leaseId: 'lease-1', tenantId: 't-1', isPrimary: true });

  invoiceRows.set('inv-1', {
    id: 'inv-1',
    orgId: 'org-1',
    leaseId: 'lease-1',
    periodStart: new Date('2026-01-01T00:00:00.000Z'),
    status: 'DUE',
    amountCents: 1000,
    totalCents: 1000,
  });
  lineItemRows.set('li-1', {
    id: 'li-1',
    invoiceId: 'inv-1',
    kind: 'RENT',
    amountCents: 1000,
  });
  invoiceRows.set('inv-2', {
    id: 'inv-2',
    orgId: 'org-1',
    leaseId: 'lease-1',
    periodStart: new Date('2026-02-01T00:00:00.000Z'),
    status: 'DUE',
    amountCents: 1000,
    totalCents: 1000,
  });
  lineItemRows.set('li-2', {
    id: 'li-2',
    invoiceId: 'inv-2',
    kind: 'RENT',
    amountCents: 1000,
  });
}

describe('payments service', () => {
  it('records a receipt with a matching RECEIPT ledger entry', async () => {
    seedFixtures();
    const ctx = ctxWithRole('ADMIN');
    const r = await payments.recordIncomingPayment(ctx, {
      tenantId: 't-1',
      leaseId: 'lease-1',
      receivedAt: new Date('2026-02-15').toISOString(),
      amountCents: 1000,
      method: 'EFT',
      source: 'MANUAL',
    });
    assert.equal(r.amountCents, 1000);
    const recEntries = [...ledgerRows.values()].filter((e) => e.type === 'RECEIPT');
    assert.equal(recEntries.length, 1);
    assert.equal(recEntries[0].amountCents, 1000);
    assert.equal(recEntries[0].landlordId, 'll-1');
  });

  it('auto-allocates oldest-first when allocations omitted', async () => {
    seedFixtures();
    const ctx = ctxWithRole('ADMIN');
    const r = await payments.recordIncomingPayment(ctx, {
      tenantId: 't-1',
      leaseId: 'lease-1',
      receivedAt: new Date('2026-02-15').toISOString(),
      amountCents: 1500,
      method: 'EFT',
      source: 'MANUAL',
    });
    const allocs = await payments.allocateReceipt(ctx, r.id, {});
    assert.equal(allocs.length, 2);
    assert.equal(allocs[0].invoiceLineItemId, 'li-1');
    assert.equal(allocs[0].amountCents, 1000);
    assert.equal(allocs[1].invoiceLineItemId, 'li-2');
    assert.equal(allocs[1].amountCents, 500);
  });

  it('rejects allocations exceeding receipt amount', async () => {
    seedFixtures();
    const ctx = ctxWithRole('ADMIN');
    const r = await payments.recordIncomingPayment(ctx, {
      tenantId: 't-1',
      leaseId: 'lease-1',
      receivedAt: new Date('2026-02-15').toISOString(),
      amountCents: 500,
      method: 'EFT',
      source: 'MANUAL',
    });
    await assert.rejects(
      () =>
        payments.allocateReceipt(ctx, r.id, {
          allocations: [
            { target: 'INVOICE_LINE_ITEM', invoiceLineItemId: 'li-1', amountCents: 1000 },
          ],
        }),
      (err: any) =>
        err?.code === 'VALIDATION_ERROR' &&
        typeof err?.details?.allocations === 'string' &&
        err.details.allocations.includes('exceeds remaining'),
    );
  });

  it('ADMIN can reverse an allocation older than 30 days', async () => {
    seedFixtures();
    const ctx = ctxWithRole('ADMIN');
    const r = await payments.recordIncomingPayment(ctx, {
      tenantId: 't-1',
      leaseId: 'lease-1',
      receivedAt: new Date('2026-02-15').toISOString(),
      amountCents: 1000,
      method: 'EFT',
      source: 'MANUAL',
    });
    const allocs = await payments.allocateReceipt(ctx, r.id, {});
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    allocationRows.get(allocs[0].id).createdAt = oldDate;

    await payments.reverseAllocation(ctx, allocs[0].id, 'late correction');
    const reversed = allocationRows.get(allocs[0].id);
    assert.ok(reversed.reversedAt instanceof Date);
    const reversalEntries = [...ledgerRows.values()].filter((e) => e.type === 'REVERSAL');
    assert.equal(reversalEntries.length, 1);
  });

  it('non-ADMIN is blocked from reversing an allocation older than 30 days', async () => {
    seedFixtures();
    const adminCtx = ctxWithRole('ADMIN');
    const pmCtx = ctxWithRole('PROPERTY_MANAGER');
    const r = await payments.recordIncomingPayment(adminCtx, {
      tenantId: 't-1',
      leaseId: 'lease-1',
      receivedAt: new Date('2026-02-15').toISOString(),
      amountCents: 1000,
      method: 'EFT',
      source: 'MANUAL',
    });
    const allocs = await payments.allocateReceipt(adminCtx, r.id, {});
    allocationRows.get(allocs[0].id).createdAt = new Date(
      Date.now() - 45 * 24 * 60 * 60 * 1000,
    );
    await assert.rejects(
      () => payments.reverseAllocation(pmCtx, allocs[0].id, 'too late'),
      /ADMIN/,
    );
  });
});
