import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let reconciliations: any;
let qboModule: any;

const orgIntegrationRows = new Map<string, any>();
const receiptRows = new Map<string, any>();
const runRows = new Map<string, any>();
const exceptionRows = new Map<string, any>();

let mockBankTx: {
  occurredAt: Date;
  amountCents: number;
  reference: string;
  externalId: string;
  sourceRaw: unknown;
}[] = [];

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

  save('orgIntegration.findUnique', db.orgIntegration.findUnique);
  save('paymentReceipt.findMany', db.paymentReceipt.findMany);
  save('reconciliationRun.create', db.reconciliationRun.create);
  save('reconciliationRun.update', db.reconciliationRun.update);
  save('reconciliationRun.findMany', db.reconciliationRun.findMany);
  save('reconciliationException.create', db.reconciliationException.create);
  save('reconciliationException.update', db.reconciliationException.update);
  save('reconciliationException.findFirst', db.reconciliationException.findFirst);
  save('auditLog.create', db.auditLog.create);

  db.orgIntegration.findUnique = async ({ where }: any) => {
    const k = where.orgId_provider
      ? `${where.orgId_provider.orgId}:${where.orgId_provider.provider}`
      : where.id;
    return orgIntegrationRows.get(k) ?? null;
  };
  db.paymentReceipt.findMany = async ({ where }: any) => {
    return [...receiptRows.values()].filter((r) => {
      if (where.orgId && r.orgId !== where.orgId) return false;
      if (where.source && r.source !== where.source) return false;
      if (where.amountCents != null && r.amountCents !== where.amountCents) return false;
      if (where.externalRef && r.externalRef !== where.externalRef) return false;
      if (where.receivedAt?.gte && r.receivedAt < where.receivedAt.gte) return false;
      if (where.receivedAt?.lte && r.receivedAt > where.receivedAt.lte) return false;
      return true;
    });
  };
  db.reconciliationRun.create = async ({ data }: any) => {
    const id = `run-${runRows.size + 1}`;
    const row = { id, createdAt: new Date(), summary: null, ...data };
    runRows.set(id, row);
    return row;
  };
  db.reconciliationRun.update = async ({ where, data }: any) => {
    const row = runRows.get(where.id);
    Object.assign(row, data);
    return row;
  };
  db.reconciliationRun.findMany = async ({ where }: any) =>
    [...runRows.values()].filter((r) => !where?.orgId || r.orgId === where.orgId);
  db.reconciliationException.create = async ({ data }: any) => {
    const id = `ex-${exceptionRows.size + 1}`;
    const row = { id, createdAt: new Date(), resolvedAt: null, resolvedById: null, ...data };
    exceptionRows.set(id, row);
    return row;
  };
  db.reconciliationException.update = async ({ where, data }: any) => {
    const row = exceptionRows.get(where.id);
    Object.assign(row, data);
    return row;
  };
  db.reconciliationException.findFirst = async ({ where }: any) => {
    for (const row of exceptionRows.values()) {
      const run = runRows.get(row.runId);
      if (where.run?.orgId && run?.orgId !== where.run.orgId) continue;
      if (
        where.run?.periodStart &&
        run?.periodStart?.getTime?.() !== where.run.periodStart.getTime?.()
      )
        continue;
      if (where.run?.periodEnd && run?.periodEnd?.getTime?.() !== where.run.periodEnd.getTime?.())
        continue;
      if (where.entityType && row.entityType !== where.entityType) continue;
      if (where.entityId && row.entityId !== where.entityId) continue;
      if (where.runId?.not && row.runId === where.runId.not) continue;
      if (where.id && row.id !== where.id) continue;
      return row;
    }
    return null;
  };
  db.auditLog.create = async ({ data }: any) => ({ id: 'a', ...data });

  qboModule = await import('@/lib/integrations/qbo/adapter');
  qboModule.qboAdapter.fetchBankTransactions = async () => mockBankTx;

  reconciliations = await import('@/lib/services/reconciliations');
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  orgIntegrationRows.clear();
  receiptRows.clear();
  runRows.clear();
  exceptionRows.clear();
  mockBankTx = [];
  // QBO CONNECTED path so the service calls our mocked adapter rather than the CSV fallback.
  orgIntegrationRows.set('org-1:QUICKBOOKS', {
    id: 'oi-1',
    orgId: 'org-1',
    provider: 'QUICKBOOKS',
    status: 'CONNECTED',
  });
});

function seedReceipt(overrides: Partial<any>) {
  const id = overrides.id ?? `r-${receiptRows.size + 1}`;
  const row = {
    id,
    orgId: 'org-1',
    tenantId: null,
    leaseId: null,
    receivedAt: new Date('2026-02-10T00:00:00Z'),
    amountCents: 1000,
    method: 'EFT',
    source: 'CSV_IMPORT',
    externalRef: 'REF-A',
    note: null,
    ...overrides,
  };
  receiptRows.set(id, row);
  return row;
}

const ctx = { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
const period = {
  start: new Date('2026-02-01T00:00:00Z'),
  end: new Date('2026-02-28T00:00:00Z'),
};

describe('runTrustReconciliation', () => {
  it('bank tx matching a seeded receipt produces zero exceptions', async () => {
    seedReceipt({ externalRef: 'REF-A', amountCents: 1000, receivedAt: new Date('2026-02-10') });
    mockBankTx = [
      {
        occurredAt: new Date('2026-02-10'),
        amountCents: 1000,
        reference: 'REF-A',
        externalId: 'qbo-1',
        sourceRaw: {},
      },
    ];
    const run = await reconciliations.runTrustReconciliation(ctx, period);
    assert.equal(run.status, 'COMPLETED');
    const exs = [...exceptionRows.values()];
    assert.equal(exs.length, 0);
    assert.equal((run.summary as any).matched, 1);
    assert.equal((run.summary as any).exceptions, 0);
  });

  it('bank tx with no matching receipt creates one UNMATCHED_BANK_TX exception', async () => {
    mockBankTx = [
      {
        occurredAt: new Date('2026-02-10'),
        amountCents: 5000,
        reference: 'REF-ORPHAN',
        externalId: 'qbo-orphan',
        sourceRaw: {},
      },
    ];
    const run = await reconciliations.runTrustReconciliation(ctx, period);
    const exs = [...exceptionRows.values()];
    assert.equal(exs.length, 1);
    assert.equal(exs[0].kind, 'UNMATCHED_BANK_TX');
    assert.equal(exs[0].entityType, 'BankTransaction');
    assert.equal(exs[0].entityId, 'qbo-orphan');
    assert.equal((run.summary as any).exceptions, 1);
  });

  it('re-running for the same period is deterministic (no duplicate exceptions)', async () => {
    mockBankTx = [
      {
        occurredAt: new Date('2026-02-15'),
        amountCents: 3000,
        reference: 'REF-DUP',
        externalId: 'qbo-dup',
        sourceRaw: {},
      },
    ];
    await reconciliations.runTrustReconciliation(ctx, period);
    await reconciliations.runTrustReconciliation(ctx, period);

    const exs = [...exceptionRows.values()];
    assert.equal(exs.length, 1);
    assert.equal(exs[0].entityId, 'qbo-dup');
  });
});

describe('resolveException', () => {
  it('marks exception resolved', async () => {
    mockBankTx = [
      {
        occurredAt: new Date('2026-02-10'),
        amountCents: 100,
        reference: 'REF-X',
        externalId: 'qbo-x',
        sourceRaw: {},
      },
    ];
    await reconciliations.runTrustReconciliation(ctx, period);
    const exs = [...exceptionRows.values()];
    assert.equal(exs.length, 1);
    const resolved = await reconciliations.resolveException(ctx, exs[0].id, 'handled manually');
    assert.ok(resolved.resolvedAt instanceof Date);
    assert.equal(resolved.resolvedById, 'u-1');
  });
});
