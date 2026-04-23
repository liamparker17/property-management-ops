import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');
process.env.BANK_REF_PREFIX = 'PMO-';

let db: any;
let payments: any;

const landlordRows = new Map<string, any>();
const trustAccountRows = new Map<string, any>();
const ledgerRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const unitRows = new Map<string, any>();
const propertyRows = new Map<string, any>();
const invoiceRows = new Map<string, any>();
const lineItemRows = new Map<string, any>();
const allocationRows = new Map<string, any>();
const receiptRows = new Map<string, any>();

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

  save('lease.findFirst', db.lease.findFirst);
  save('landlord.findFirst', db.landlord.findFirst);
  save('trustAccount.findUnique', db.trustAccount.findUnique);
  save('trustAccount.create', db.trustAccount.create);
  save('trustLedgerEntry.create', db.trustLedgerEntry.create);
  save('paymentReceipt.findFirst', db.paymentReceipt.findFirst);
  save('paymentReceipt.create', db.paymentReceipt.create);
  save('allocation.create', db.allocation.create);
  save('invoice.findMany', db.invoice.findMany);
  save('leaseTenant.findFirst', db.leaseTenant.findFirst);
  save('auditLog.create', db.auditLog.create);
  save('$transaction', db.$transaction);

  db.lease.findFirst = async ({ where, include }: any) => {
    let row: any = null;
    if (where.id) {
      row = leaseRows.get(where.id);
    } else {
      for (const r of leaseRows.values()) {
        if (where.orgId && r.orgId !== where.orgId) continue;
        row = r; break;
      }
    }
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    if (include?.unit?.include?.property) {
      const unit = unitRows.get(row.unitId);
      const property = propertyRows.get(unit?.propertyId);
      return { ...row, unit: { ...unit, property } };
    }
    return row;
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
  db.trustLedgerEntry.create = async ({ data }: any) => {
    const id = `le-${ledgerRows.size + 1}`;
    const row = { id, createdAt: new Date(), ...data };
    ledgerRows.set(id, row);
    return row;
  };
  db.paymentReceipt.findFirst = async ({ where, include }: any) => {
    for (const row of receiptRows.values()) {
      if (where.orgId && row.orgId !== where.orgId) continue;
      if (where.externalRef && row.externalRef !== where.externalRef) continue;
      if (where.id && row.id !== where.id) continue;
      if (include?.allocations) {
        const allocs = [...allocationRows.values()].filter((a) => a.receiptId === row.id);
        return { ...row, allocations: allocs };
      }
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
  db.allocation.create = async ({ data }: any) => {
    const id = `al-${allocationRows.size + 1}`;
    const row = { id, createdAt: new Date(), reversedAt: null, ...data };
    allocationRows.set(id, row);
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
    if (where.status?.in) rows = rows.filter((i) => where.status.in.includes(i.status));
    rows = rows.slice().sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
    if (include?.lineItems) {
      return rows.map((inv) => ({
        ...inv,
        lineItems: [...lineItemRows.values()]
          .filter((li) => li.invoiceId === inv.id)
          .map((li) => ({
            ...li,
            allocations: [...allocationRows.values()].filter(
              (a) => a.invoiceLineItemId === li.id,
            ),
          })),
      }));
    }
    return rows;
  };
  db.leaseTenant.findFirst = async () => null;
  db.auditLog.create = async ({ data }: any) => ({ id: 'a', ...data });
  db.$transaction = async (arg: any) => (typeof arg === 'function' ? arg(db) : Promise.all(arg));

  payments = await import('@/lib/services/payments');
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  landlordRows.clear();
  trustAccountRows.clear();
  ledgerRows.clear();
  leaseRows.clear();
  unitRows.clear();
  propertyRows.clear();
  invoiceRows.clear();
  lineItemRows.clear();
  allocationRows.clear();
  receiptRows.clear();
});

function seed() {
  landlordRows.set('ll-1', { id: 'll-1', orgId: 'org-1', name: 'Alpha', archivedAt: null });
  propertyRows.set('p-1', { id: 'p-1', orgId: 'org-1', landlordId: 'll-1' });
  unitRows.set('u-1', { id: 'u-1', orgId: 'org-1', propertyId: 'p-1' });
  leaseRows.set('lease-1', { id: 'lease-1', orgId: 'org-1', unitId: 'u-1', state: 'ACTIVE' });
  invoiceRows.set('inv-1', {
    id: 'inv-1',
    orgId: 'org-1',
    leaseId: 'lease-1',
    periodStart: new Date('2026-01-01'),
    status: 'DUE',
    amountCents: 1000,
    totalCents: 1000,
  });
  lineItemRows.set('li-1', { id: 'li-1', invoiceId: 'inv-1', kind: 'RENT', amountCents: 1000 });
}

describe('importReceiptsCsv reference matcher', () => {
  it('auto-allocates when reference matches PMO-<leaseId>', async () => {
    seed();
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    const csv = [
      'receivedAt,amount,method,reference,note',
      '2026-02-15,10.00,EFT,PMO-lease-1,rent',
    ].join('\n');

    const result = await payments.importReceiptsCsv(ctx, csv);
    assert.equal(result.created.length, 1);
    const receipt = result.created[0];
    assert.equal(receipt.leaseId, 'lease-1');

    const allocs = [...allocationRows.values()];
    assert.equal(allocs.length, 1);
    assert.equal(allocs[0].invoiceLineItemId, 'li-1');
    assert.equal(allocs[0].amountCents, 1000);
  });

  it('leaves receipt unallocated when reference does not match any lease', async () => {
    seed();
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    const csv = [
      'receivedAt,amount,method,reference,note',
      '2026-02-15,10.00,EFT,UNKNOWN-REF,rent',
    ].join('\n');
    const result = await payments.importReceiptsCsv(ctx, csv);
    assert.equal(result.created.length, 1);
    const allocs = [...allocationRows.values()];
    assert.equal(allocs.length, 0);
  });
});
