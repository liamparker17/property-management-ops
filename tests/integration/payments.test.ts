import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let invoices: any;
let trust: any;

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
  save('trustLedgerEntry.create', db.trustLedgerEntry.create);
  save('trustLedgerEntry.findMany', db.trustLedgerEntry.findMany);
  save('paymentReceipt.create', db.paymentReceipt.create);
  save('paymentReceipt.findFirst', db.paymentReceipt.findFirst);
  save('paymentReceipt.delete', db.paymentReceipt.delete);
  save('allocation.create', db.allocation.create);
  save('allocation.findUnique', db.allocation.findUnique);
  save('allocation.update', db.allocation.update);
  save('lease.findFirst', db.lease.findFirst);
  save('leaseTenant.findFirst', db.leaseTenant.findFirst);
  save('tenant.findFirst', db.tenant.findFirst);
  save('invoice.findFirst', db.invoice.findFirst);
  save('invoice.findMany', db.invoice.findMany);
  save('invoice.update', db.invoice.update);
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
    let candidate: any = where.id ? receiptRows.get(where.id) ?? null : null;
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
      return {
        ...candidate,
        allocations: [...allocationRows.values()].filter((a) => a.receiptId === candidate.id),
      };
    }
    return candidate;
  };
  db.paymentReceipt.delete = async ({ where }: any) => {
    receiptRows.delete(where.id);
    return { id: where.id };
  };
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
  db.leaseTenant.findFirst = async ({ where }: any) => {
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
  db.tenant.findFirst = async ({ where }: any) => {
    const row = tenantRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.invoice.findFirst = async ({ where, select }: any) => {
    const row = invoiceRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    if (select) {
      const out: any = {};
      for (const k of Object.keys(select)) {
        if (k === 'lease' && select.lease) {
          const lease = leaseRows.get(row.leaseId);
          out.lease = {
            tenants: leaseTenantRows
              .filter((lt) => lt.leaseId === lease.id && lt.isPrimary)
              .map((lt) => ({ tenantId: lt.tenantId })),
          };
        } else if (k === 'lineItems') {
          out.lineItems = [...lineItemRows.values()]
            .filter((li) => li.invoiceId === row.id)
            .map((li) => ({ id: li.id, amountCents: li.amountCents }));
        } else {
          out[k] = (row as any)[k];
        }
      }
      return out;
    }
    return row;
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
  db.invoice.update = async ({ where, data, include }: any) => {
    const row = invoiceRows.get(where.id);
    Object.assign(row, data);
    if (include?.lease) {
      return { ...row, lease: { tenants: [] } };
    }
    return row;
  };
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };
  db.$transaction = async (arg: any) => {
    if (typeof arg === 'function') return arg(db);
    return Promise.all(arg);
  };

  invoices = (await import('@/lib/services/invoices')) as any;
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

function seed() {
  landlordRows.set('ll-1', { id: 'll-1', orgId: 'org-1', name: 'Landlord 1', archivedAt: null });
  propertyRows.set('p-1', { id: 'p-1', orgId: 'org-1', landlordId: 'll-1' });
  unitRows.set('u-1', { id: 'u-1', orgId: 'org-1', propertyId: 'p-1' });
  tenantRows.set('t-1', { id: 't-1', orgId: 'org-1' });
  leaseRows.set('lease-1', { id: 'lease-1', orgId: 'org-1', unitId: 'u-1', state: 'ACTIVE' });
  leaseTenantRows.push({ leaseId: 'lease-1', tenantId: 't-1', isPrimary: true });
  invoiceRows.set('inv-1', {
    id: 'inv-1',
    orgId: 'org-1',
    leaseId: 'lease-1',
    periodStart: new Date('2026-03-01T00:00:00.000Z'),
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
}

describe('payments integration: invoices + trust ledger', () => {
  it('markInvoicePaid creates a receipt + matching ledger entries; tenant position is balanced', async () => {
    seed();
    await invoices.markInvoicePaid(ctx, 'inv-1', {});
    const receipts = [...receiptRows.values()];
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0].source, 'MANUAL');
    assert.equal(receipts[0].amountCents, 1000);

    const allocs = [...allocationRows.values()];
    assert.equal(allocs.length, 1);
    assert.equal(allocs[0].invoiceLineItemId, 'li-1');
    assert.equal(allocs[0].amountCents, 1000);

    const recEntries = [...ledgerRows.values()].filter((e) => e.type === 'RECEIPT');
    const allocEntries = [...ledgerRows.values()].filter((e) => e.type === 'ALLOCATION');
    assert.equal(recEntries.length, 1);
    assert.equal(allocEntries.length, 1);
    assert.equal(recEntries[0].amountCents + allocEntries[0].amountCents, 0);

    const pos = await trust.getTenantTrustPosition(ctx, 't-1');
    assert.equal(pos.unappliedCents, 0);
    assert.equal(pos.receiptsCents, 1000);
  });

  it('markInvoiceUnpaid reverses allocations and deletes the auto-generated receipt', async () => {
    seed();
    await invoices.markInvoicePaid(ctx, 'inv-1', {});
    assert.equal(receiptRows.size, 1);
    await invoices.markInvoiceUnpaid(ctx, 'inv-1');
    assert.equal(receiptRows.size, 0);
    const reversals = [...ledgerRows.values()].filter((e) => e.type === 'REVERSAL');
    assert.equal(reversals.length, 1);
    const inv = invoiceRows.get('inv-1');
    assert.equal(inv.status, 'DUE');
    assert.equal(inv.paidAt, null);
  });
});
