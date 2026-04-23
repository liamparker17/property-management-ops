import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let payments: any;

const receiptRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const allocationRows = new Map<string, any>();
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

  save('paymentReceipt.findFirst', db.paymentReceipt.findFirst);
  save('paymentReceipt.create', db.paymentReceipt.create);
  save('lease.findFirst', db.lease.findFirst);
  save('leaseTenant.findFirst', db.leaseTenant.findFirst);
  save('allocation.create', db.allocation.create);
  save('invoice.findMany', db.invoice.findMany);
  save('auditLog.create', db.auditLog.create);
  save('$transaction', db.$transaction);

  db.paymentReceipt.findFirst = async ({ where }: any) => {
    for (const row of receiptRows.values()) {
      if (where.orgId && row.orgId !== where.orgId) continue;
      if (where.externalRef && row.externalRef !== where.externalRef) continue;
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
  db.lease.findFirst = async ({ where }: any) => {
    for (const row of leaseRows.values()) {
      if (where.id && row.id !== where.id) continue;
      if (where.orgId && row.orgId !== where.orgId) continue;
      return row;
    }
    return null;
  };
  db.leaseTenant.findFirst = async () => null;
  db.allocation.create = async ({ data }: any) => {
    const id = `al-${allocationRows.size + 1}`;
    const row = { id, createdAt: new Date(), reversedAt: null, ...data };
    allocationRows.set(id, row);
    return row;
  };
  db.invoice.findMany = async () => [];
  db.auditLog.create = async ({ data }: any) => ({ id: 'a', ...data });
  db.$transaction = async (arg: any) => (typeof arg === 'function' ? arg(db) : Promise.all(arg));

  payments = await import('@/lib/services/payments');
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  receiptRows.clear();
  leaseRows.clear();
  allocationRows.clear();
});

describe('importReceiptsCsv dialects', () => {
  it('generic dialect parses rows and creates receipts', async () => {
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    const csv = [
      'receivedAt,amount,method,reference,note',
      '2026-02-01,100.00,EFT,REF-A,',
      '2026-02-02,250.50,EFT,REF-B,rent',
    ].join('\n');
    const result = await payments.importReceiptsCsv(ctx, csv);
    assert.equal(result.created.length, 2);
    assert.equal(result.skipped.length, 0);
    assert.equal(result.created[0].amountCents, 10000);
    assert.equal(result.created[1].amountCents, 25050);
  });

  it('dedupes rows with duplicate externalRef', async () => {
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    const csv = [
      'receivedAt,amount,method,reference,note',
      '2026-02-01,100.00,EFT,REF-DUP,',
      '2026-02-02,100.00,EFT,REF-DUP,',
    ].join('\n');
    const result = await payments.importReceiptsCsv(ctx, csv);
    assert.equal(result.created.length, 1);
    assert.equal(result.skipped.length, 1);
    assert.match(result.skipped[0].reason, /Duplicate/);
  });

  it('rejects CSV when header is missing', async () => {
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    const csv = ['receivedAt,amount,method,reference', '2026-02-01,100.00,EFT,REF-A'].join('\n');
    await assert.rejects(
      () => payments.importReceiptsCsv(ctx, csv),
      (err: any) => err?.code === 'VALIDATION_ERROR' && /Missing header/.test(err?.details?.csv ?? ''),
    );
  });

  it('throws when non-generic dialect requested', async () => {
    const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
    const csv = ['receivedAt,amount,method,reference,note', '2026-02-01,100.00,EFT,REF-A,'].join('\n');
    await assert.rejects(
      () => payments.importReceiptsCsv(ctx, csv, 'fnb'),
      (err: any) => err?.code === 'VALIDATION_ERROR' && /generic/.test(err?.details?.dialect ?? ''),
    );
  });
});
