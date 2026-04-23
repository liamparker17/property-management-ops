import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let statements: any;

const tenantRows = new Map<string, any>();
const landlordRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const unitRows = new Map<string, any>();
const trustAccountRows = new Map<string, any>();
const ledgerRows = new Map<string, any>();
const receiptRows = new Map<string, any>();
const allocationRows = new Map<string, any>();
const statementRows = new Map<string, any>();
const statementLineRows = new Map<string, any>();
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
  (globalThis as any).__PMOPS_UPLOAD_BLOB__ = async (path: string) => ({
    url: `https://blob.test/${path}`,
    pathname: path,
  });

  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  const save = (path: string, fn: any) => {
    originals[path] = fn;
  };

  save('tenant.findFirst', db.tenant.findFirst);
  save('tenant.findMany', db.tenant.findMany);
  save('landlord.findFirst', db.landlord.findFirst);
  save('lease.findMany', db.lease.findMany);
  save('trustLedgerEntry.findMany', db.trustLedgerEntry.findMany);
  save('paymentReceipt.findMany', db.paymentReceipt.findMany);
  save('statement.create', db.statement.create);
  save('statement.findFirst', db.statement.findFirst);
  save('statement.findMany', db.statement.findMany);
  save('statement.update', db.statement.update);
  save('statementLine.create', db.statementLine.create);
  save('statementLine.findMany', db.statementLine.findMany);
  save('auditLog.create', db.auditLog.create);
  save('$transaction', db.$transaction);

  db.tenant.findFirst = async ({ where }: any) => {
    const row = tenantRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.tenant.findMany = async ({ where }: any) => {
    const ids: string[] = where?.id?.in ?? [];
    return ids.map((id) => tenantRows.get(id)).filter(Boolean);
  };
  db.landlord.findFirst = async ({ where }: any) => {
    const row = landlordRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.lease.findMany = async ({ where }: any) => {
    const ids: string[] = where?.id?.in ?? [];
    return ids.map((id) => {
      const l = leaseRows.get(id);
      if (!l) return null;
      return { ...l, unit: unitRows.get(l.unitId) ?? null };
    }).filter(Boolean);
  };
  db.trustLedgerEntry.findMany = async ({ where }: any) => {
    return [...ledgerRows.values()].filter((e) => {
      if (where.landlordId && e.landlordId !== where.landlordId) return false;
      if (where.tenantId && e.tenantId !== where.tenantId) return false;
      if (where.trustAccount?.orgId) {
        const acc = trustAccountRows.get(e.trustAccountId);
        if (!acc || acc.orgId !== where.trustAccount.orgId) return false;
      }
      if (where.type?.in && !where.type.in.includes(e.type)) return false;
      if (where.occurredAt?.lt && e.occurredAt.getTime() >= where.occurredAt.lt.getTime()) return false;
      if (where.occurredAt?.gte && e.occurredAt.getTime() < where.occurredAt.gte.getTime()) return false;
      if (where.occurredAt?.lte && e.occurredAt.getTime() > where.occurredAt.lte.getTime()) return false;
      return true;
    });
  };
  db.paymentReceipt.findMany = async ({ where, include }: any) => {
    const rows = [...receiptRows.values()].filter((r) => {
      if (r.orgId !== where.orgId) return false;
      if (where.tenantId && r.tenantId !== where.tenantId) return false;
      if (where.receivedAt?.gte && r.receivedAt.getTime() < where.receivedAt.gte.getTime()) return false;
      if (where.receivedAt?.lte && r.receivedAt.getTime() > where.receivedAt.lte.getTime()) return false;
      return true;
    });
    if (include?.allocations) {
      return rows.map((r) => ({
        ...r,
        allocations: [...allocationRows.values()].filter((a) => a.receiptId === r.id),
      }));
    }
    return rows;
  };
  db.statement.create = async ({ data }: any) => {
    const id = `stmt-${statementRows.size + 1}`;
    const row = { id, generatedAt: new Date(), storageKey: null, ...data };
    statementRows.set(id, row);
    return row;
  };
  db.statement.findFirst = async ({ where, include }: any) => {
    const row = statementRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    if (include?.lines) {
      const lines = [...statementLineRows.values()].filter((l) => l.statementId === row.id);
      return { ...row, lines };
    }
    return row;
  };
  db.statement.findMany = async ({ where, orderBy }: any) => {
    let rows = [...statementRows.values()].filter((r) => r.orgId === where.orgId);
    if (where.subjectType) rows = rows.filter((r) => r.subjectType === where.subjectType);
    if (where.subjectId) rows = rows.filter((r) => r.subjectId === where.subjectId);
    if (where.type) rows = rows.filter((r) => r.type === where.type);
    if (orderBy?.generatedAt === 'desc') {
      rows.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    }
    return rows;
  };
  db.statement.update = async ({ where, data }: any) => {
    const row = statementRows.get(where.id);
    Object.assign(row, data);
    return row;
  };
  db.statementLine.create = async ({ data }: any) => {
    const id = `sl-${statementLineRows.size + 1}`;
    const row = { id, ...data };
    statementLineRows.set(id, row);
    return row;
  };
  db.statementLine.findMany = async ({ where }: any) =>
    [...statementLineRows.values()].filter((l) => l.statementId === where.statementId);
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };
  db.$transaction = async (arg: any) => {
    if (typeof arg === 'function') return arg(db);
    return Promise.all(arg);
  };

  statements = (await import('@/lib/services/statements')) as any;
});

after(async () => {
  delete (globalThis as any).__PMOPS_UPLOAD_BLOB__;
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  tenantRows.clear();
  landlordRows.clear();
  leaseRows.clear();
  unitRows.clear();
  trustAccountRows.clear();
  ledgerRows.clear();
  receiptRows.clear();
  allocationRows.clear();
  statementRows.clear();
  statementLineRows.clear();
  auditCalls.length = 0;
});

function seedCommon() {
  landlordRows.set('ll-1', { id: 'll-1', orgId: 'org-1', name: 'Landlord One' });
  trustAccountRows.set('ta-1', { id: 'ta-1', orgId: 'org-1', landlordId: 'll-1' });
  unitRows.set('u-1', { id: 'u-1', label: 'Unit A', propertyId: 'p-1' });
  leaseRows.set('lease-1', { id: 'lease-1', orgId: 'org-1', unitId: 'u-1' });
  tenantRows.set('t-1', { id: 't-1', orgId: 'org-1', firstName: 'Alice', lastName: 'Ngcobo' });
}

function addLedger(entry: Partial<any>) {
  const id = `le-${ledgerRows.size + 1}`;
  ledgerRows.set(id, {
    id,
    trustAccountId: 'ta-1',
    createdAt: new Date(),
    tenantId: null,
    leaseId: null,
    note: null,
    ...entry,
  });
}

describe('statements service', () => {
  it('generates a tenant statement with opening balance + receipt/allocation lines', async () => {
    seedCommon();

    addLedger({
      landlordId: 'll-1',
      tenantId: 't-1',
      type: 'RECEIPT',
      amountCents: 50000,
      occurredAt: new Date('2026-01-15T08:00:00.000Z'),
    });

    receiptRows.set('r-1', {
      id: 'r-1',
      orgId: 'org-1',
      tenantId: 't-1',
      leaseId: 'lease-1',
      receivedAt: new Date('2026-03-05T08:00:00.000Z'),
      amountCents: 100000,
      method: 'EFT',
      externalRef: 'REF-A',
    });
    allocationRows.set('a-1', {
      id: 'a-1',
      receiptId: 'r-1',
      target: 'INVOICE_LINE_ITEM',
      amountCents: 80000,
      createdAt: new Date('2026-03-06T08:00:00.000Z'),
      reversedAt: null,
    });

    const stmt = await statements.generateTenantStatement(ctx, 't-1', {
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.000Z'),
    });

    assert.equal(stmt.type, 'TENANT');
    assert.equal(stmt.subjectType, 'Tenant');
    assert.equal(stmt.subjectId, 't-1');
    assert.equal(stmt.openingBalanceCents, 50000);
    assert.equal(typeof stmt.storageKey, 'string');
    assert.ok(stmt.storageKey.includes('statements/org-1/'));

    const lines = [...statementLineRows.values()].filter((l) => l.statementId === stmt.id);
    assert.equal(lines.length, 2);
    const credit = lines.find((l) => l.creditCents > 0)!;
    const debit = lines.find((l) => l.debitCents > 0)!;
    assert.equal(credit.creditCents, 100000);
    assert.equal(debit.debitCents, 80000);

    assert.ok(auditCalls.some((a) => a.action === 'generateTenantStatement'));
  });

  it('regenerate keeps StatementLine rows byte-identical but advances generatedAt', async () => {
    seedCommon();
    receiptRows.set('r-1', {
      id: 'r-1',
      orgId: 'org-1',
      tenantId: 't-1',
      leaseId: 'lease-1',
      receivedAt: new Date('2026-03-05T08:00:00.000Z'),
      amountCents: 40000,
      method: 'EFT',
      externalRef: null,
    });

    const stmt = await statements.generateTenantStatement(ctx, 't-1', {
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.000Z'),
    });

    const linesBefore = [...statementLineRows.values()]
      .filter((l) => l.statementId === stmt.id)
      .map((l) => ({ ...l }));
    const generatedAtBefore = stmt.generatedAt as Date;

    // small delay to guarantee a new timestamp
    await new Promise((resolve) => setTimeout(resolve, 5));

    const regenerated = await statements.regenerateStatement(ctx, stmt.id);

    const linesAfter = [...statementLineRows.values()].filter(
      (l) => l.statementId === stmt.id,
    );

    assert.equal(linesAfter.length, linesBefore.length);
    for (let i = 0; i < linesBefore.length; i++) {
      const before = linesBefore[i];
      const after = linesAfter.find((l) => l.id === before.id)!;
      assert.equal(after.description, before.description);
      assert.equal(after.debitCents, before.debitCents);
      assert.equal(after.creditCents, before.creditCents);
      assert.equal(after.runningBalanceCents, before.runningBalanceCents);
    }

    assert.ok(regenerated.generatedAt instanceof Date);
    assert.ok((regenerated.generatedAt as Date).getTime() > generatedAtBefore.getTime());
  });

  it('generates a landlord statement with RECEIPT/DISBURSEMENT/FEE rows scoped by period', async () => {
    seedCommon();
    addLedger({
      landlordId: 'll-1',
      type: 'RECEIPT',
      amountCents: 20000,
      occurredAt: new Date('2026-01-10T08:00:00.000Z'),
    });
    addLedger({
      landlordId: 'll-1',
      type: 'RECEIPT',
      amountCents: 100000,
      occurredAt: new Date('2026-03-10T08:00:00.000Z'),
    });
    addLedger({
      landlordId: 'll-1',
      type: 'DISBURSEMENT',
      amountCents: -80000,
      occurredAt: new Date('2026-03-20T08:00:00.000Z'),
    });
    addLedger({
      landlordId: 'll-1',
      type: 'FEE',
      amountCents: -5000,
      occurredAt: new Date('2026-03-25T08:00:00.000Z'),
    });
    addLedger({
      landlordId: 'll-1',
      type: 'ALLOCATION',
      amountCents: 7777,
      occurredAt: new Date('2026-03-15T08:00:00.000Z'),
    });

    const stmt = await statements.generateLandlordStatement(ctx, 'll-1', {
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.000Z'),
    });

    assert.equal(stmt.openingBalanceCents, 20000);
    const lines = [...statementLineRows.values()].filter((l) => l.statementId === stmt.id);
    assert.equal(lines.length, 3);
  });

  it('generates a per-landlord trust statement with per-tenant grouped rows', async () => {
    seedCommon();
    tenantRows.set('t-2', { id: 't-2', orgId: 'org-1', firstName: 'Bob', lastName: 'Khumalo' });
    addLedger({
      landlordId: 'll-1',
      tenantId: 't-1',
      leaseId: 'lease-1',
      type: 'RECEIPT',
      amountCents: 60000,
      occurredAt: new Date('2026-03-10T08:00:00.000Z'),
    });
    addLedger({
      landlordId: 'll-1',
      tenantId: 't-1',
      leaseId: 'lease-1',
      type: 'ALLOCATION',
      amountCents: 50000,
      occurredAt: new Date('2026-03-12T08:00:00.000Z'),
    });
    addLedger({
      landlordId: 'll-1',
      tenantId: 't-2',
      leaseId: 'lease-1',
      type: 'RECEIPT',
      amountCents: 30000,
      occurredAt: new Date('2026-03-18T08:00:00.000Z'),
    });

    const stmt = await statements.generateTrustStatement(ctx, 'll-1', {
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.000Z'),
    });

    assert.equal(stmt.type, 'TRUST');
    assert.equal(stmt.subjectType, 'Landlord');
    const lines = [...statementLineRows.values()].filter((l) => l.statementId === stmt.id);
    assert.equal(lines.length, 2);
    assert.ok(lines.every((l) => l.description.includes('Unit A') || l.description.includes('No lease')));
  });

  it('listStatements scopes by org + filters', async () => {
    seedCommon();
    statementRows.set('stmt-x', {
      id: 'stmt-x',
      orgId: 'org-1',
      type: 'TENANT',
      subjectType: 'Tenant',
      subjectId: 't-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      totalsJson: {},
      storageKey: null,
      generatedAt: new Date(),
    });
    statementRows.set('stmt-y', {
      id: 'stmt-y',
      orgId: 'org-1',
      type: 'LANDLORD',
      subjectType: 'Landlord',
      subjectId: 'll-1',
      periodStart: new Date(),
      periodEnd: new Date(),
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      totalsJson: {},
      storageKey: null,
      generatedAt: new Date(),
    });
    const onlyTenant = await statements.listStatements(ctx, { subjectType: 'Tenant', subjectId: 't-1' });
    assert.equal(onlyTenant.length, 1);
    assert.equal(onlyTenant[0].id, 'stmt-x');
  });
});
