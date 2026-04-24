import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let offboarding: any;

const caseRows = new Map<string, any>();
const taskRows = new Map<string, any>();
const chargeRows = new Map<string, any>();
const settlementRows = new Map<string, any>();
const leaseRows = new Map<string, any>();
const tenantRows = new Map<string, any>();
const unitRows = new Map<string, any>();
const propertyRows = new Map<string, any>();
const landlordRows = new Map<string, any>();
const trustAccountRows = new Map<string, any>();
const ledgerRows = new Map<string, any>();
const orgFeatureRows = new Map<string, any>();
const auditCalls: any[] = [];

const originals: Record<string, any> = {};

function ctxAdmin() {
  return { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
}

function seedLandlordTrustLease({
  withDeposit = 100_000,
  state = 'ACTIVE',
}: { withDeposit?: number; state?: string } = {}) {
  const landlord = { id: 'll-1', orgId: 'org-1', name: 'Landlord Co' };
  landlordRows.set(landlord.id, landlord);

  const property = { id: 'p-1', orgId: 'org-1', name: 'Sea View', landlordId: landlord.id };
  propertyRows.set(property.id, property);

  const unit = { id: 'unit-1', propertyId: property.id, label: '101', property };
  unitRows.set(unit.id, unit);

  const tenant = { id: 't-1', firstName: 'Jane', lastName: 'Doe' };
  tenantRows.set(tenant.id, tenant);

  const lease = {
    id: 'l-1',
    orgId: 'org-1',
    unitId: unit.id,
    state,
    depositAmountCents: withDeposit,
    tenants: [{ tenantId: tenant.id, isPrimary: true, tenant }],
    unit: { ...unit, property },
  };
  leaseRows.set(lease.id, lease);
}

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  const save = (path: string, fn: any) => { originals[path] = fn; };

  save('offboardingCase.findFirst', db.offboardingCase.findFirst);
  save('offboardingCase.create', db.offboardingCase.create);
  save('offboardingCase.update', db.offboardingCase.update);
  save('offboardingCase.findMany', db.offboardingCase.findMany);
  save('offboardingTask.findMany', db.offboardingTask.findMany);
  save('offboardingTask.findUnique', db.offboardingTask.findUnique);
  save('offboardingTask.update', db.offboardingTask.update);
  save('moveOutCharge.create', db.moveOutCharge.create);
  save('moveOutCharge.findUnique', db.moveOutCharge.findUnique);
  save('moveOutCharge.delete', db.moveOutCharge.delete);
  save('depositSettlement.upsert', db.depositSettlement.upsert);
  save('depositSettlement.update', db.depositSettlement.update);
  save('lease.findFirst', db.lease.findFirst);
  save('landlord.findFirst', db.landlord.findFirst);
  save('trustAccount.findUnique', db.trustAccount.findUnique);
  save('trustAccount.create', db.trustAccount.create);
  save('trustLedgerEntry.create', db.trustLedgerEntry.create);
  save('orgFeature.findMany', db.orgFeature.findMany);
  save('auditLog.create', db.auditLog.create);

  function attachIncludes(c: any) {
    if (!c) return c;
    return {
      ...c,
      tasks: [...taskRows.values()].filter((t) => t.caseId === c.id).sort((a, b) => a.orderIndex - b.orderIndex),
      charges: [...chargeRows.values()].filter((ch) => ch.caseId === c.id),
      settlement: [...settlementRows.values()].find((s) => s.caseId === c.id) ?? null,
    };
  }

  db.offboardingCase.findFirst = async ({ where }: any) => {
    let row: any = null;
    if (where.id) row = caseRows.get(where.id);
    else if (where.leaseId) row = [...caseRows.values()].find((c) => c.leaseId === where.leaseId);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return attachIncludes(row);
  };
  db.offboardingCase.create = async ({ data }: any) => {
    const id = `oc-${caseRows.size + 1}`;
    const row = { id, openedAt: new Date(), closedAt: null, ...data };
    delete row.tasks;
    caseRows.set(id, row);
    if (data.tasks?.create) {
      for (const t of data.tasks.create) {
        const tid = `ot-${taskRows.size + 1}`;
        taskRows.set(tid, { id: tid, caseId: id, done: false, doneAt: null, doneById: null, ...t });
      }
    }
    return attachIncludes(row);
  };
  db.offboardingCase.update = async ({ where, data }: any) => {
    const row = caseRows.get(where.id);
    if (!row) throw new Error('case not found');
    Object.assign(row, data);
    return row;
  };
  db.offboardingCase.findMany = async () => [...caseRows.values()];

  db.offboardingTask.findMany = async ({ where }: any) =>
    [...taskRows.values()].filter((t) => t.caseId === where.caseId).sort((a, b) => a.orderIndex - b.orderIndex);
  db.offboardingTask.findUnique = async ({ where, include }: any) => {
    const row = taskRows.get(where.id);
    if (!row) return null;
    if (include?.case) {
      const c = caseRows.get(row.caseId);
      return { ...row, case: { orgId: c?.orgId } };
    }
    return row;
  };
  db.offboardingTask.update = async ({ where, data }: any) => {
    const row = taskRows.get(where.id);
    if (!row) throw new Error('task not found');
    Object.assign(row, data);
    return row;
  };

  db.moveOutCharge.create = async ({ data }: any) => {
    const id = `mc-${chargeRows.size + 1}`;
    const row = { id, createdAt: new Date(), sourceInspectionItemId: null, ...data };
    chargeRows.set(id, row);
    return row;
  };
  db.moveOutCharge.findUnique = async ({ where, include }: any) => {
    const row = chargeRows.get(where.id);
    if (!row) return null;
    if (include?.case) {
      const c = caseRows.get(row.caseId);
      const settlement = [...settlementRows.values()].find((s) => s.caseId === row.caseId) ?? null;
      return { ...row, case: { orgId: c?.orgId, settlement } };
    }
    return row;
  };
  db.moveOutCharge.delete = async ({ where }: any) => {
    const row = chargeRows.get(where.id);
    chargeRows.delete(where.id);
    return row;
  };

  db.depositSettlement.upsert = async ({ where, create, update }: any) => {
    const existing = [...settlementRows.values()].find((s) => s.caseId === where.caseId);
    if (existing) {
      Object.assign(existing, update);
      return existing;
    }
    const id = `ds-${settlementRows.size + 1}`;
    const row = { id, finalizedAt: null, statementKey: null, ...create };
    settlementRows.set(id, row);
    return row;
  };
  db.depositSettlement.update = async ({ where, data }: any) => {
    const row = settlementRows.get(where.id);
    if (!row) throw new Error('settlement not found');
    Object.assign(row, data);
    return row;
  };

  db.lease.findFirst = async ({ where }: any) => {
    const row = leaseRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
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
    const row = { id, ...data };
    ledgerRows.set(id, row);
    return row;
  };
  db.orgFeature.findMany = async ({ where }: any) =>
    [...orgFeatureRows.values()].filter((f) => f.orgId === where.orgId);
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };

  offboarding = (await import('@/lib/services/offboarding')) as any;
  offboarding.__setSettlementUploaderForTests(async (path: string) => ({
    url: `https://blob.test/${path}`,
    pathname: path,
  }));
});

after(async () => {
  for (const [path, fn] of Object.entries(originals)) {
    const [ns, method] = path.split('.');
    (db as any)[ns][method] = fn;
  }
  await db.$disconnect?.();
});

beforeEach(() => {
  caseRows.clear();
  taskRows.clear();
  chargeRows.clear();
  settlementRows.clear();
  leaseRows.clear();
  tenantRows.clear();
  unitRows.clear();
  propertyRows.clear();
  landlordRows.clear();
  trustAccountRows.clear();
  ledgerRows.clear();
  orgFeatureRows.clear();
  auditCalls.length = 0;
});

describe('offboarding service', () => {
  it('seeds default tasks (no utilities billing) on openOffboardingCase', async () => {
    seedLandlordTrustLease();
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    const labels = c.tasks.map((t: any) => t.label);
    assert.deepEqual(labels, [
      'Confirm move-out date',
      'Schedule move-out inspection',
      'Collect keys',
      'Apply deposit',
      'Issue deposit statement',
    ]);
  });

  it('inserts the Final meter reading task when UTILITIES_BILLING is enabled', async () => {
    seedLandlordTrustLease();
    orgFeatureRows.set('f-1', { orgId: 'org-1', key: 'UTILITIES_BILLING', enabled: true });
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    const labels = c.tasks.map((t: any) => t.label);
    assert.equal(labels[2], 'Final meter reading');
    assert.equal(labels.length, 6);
  });

  it('openOffboardingCase is idempotent', async () => {
    seedLandlordTrustLease();
    const a = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    const b = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    assert.equal(a.id, b.id);
    assert.equal(caseRows.size, 1);
  });

  it('toggleOffboardingTask sets and clears completion state', async () => {
    seedLandlordTrustLease();
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    const taskId = c.tasks[0].id;
    const done = await offboarding.toggleOffboardingTask(ctxAdmin(), taskId, true);
    assert.equal(done.done, true);
    assert.ok(done.doneAt);
    const undone = await offboarding.toggleOffboardingTask(ctxAdmin(), taskId, false);
    assert.equal(undone.done, false);
    assert.equal(undone.doneAt, null);
  });

  it('addMoveOutCharge / removeMoveOutCharge succeed before finalisation', async () => {
    seedLandlordTrustLease();
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    const ch = await offboarding.addMoveOutCharge(ctxAdmin(), c.id, {
      label: 'Carpet stain',
      amountCents: 5_000,
      responsibility: 'TENANT',
    });
    assert.equal(ch.amountCents, 5_000);
    await offboarding.removeMoveOutCharge(ctxAdmin(), ch.id);
    assert.equal(chargeRows.size, 0);
  });

  it('finalise with no charges → full refund + DEPOSIT_OUT ledger entry', async () => {
    seedLandlordTrustLease({ withDeposit: 100_000 });
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    const settlement = await offboarding.finaliseDepositSettlement(ctxAdmin(), c.id);
    assert.equal(settlement.refundDueCents, 100_000);
    assert.equal(settlement.balanceOwedCents, 0);
    assert.ok(settlement.finalizedAt);
    const ledger = [...ledgerRows.values()];
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].type, 'DEPOSIT_OUT');
    assert.equal(ledger[0].amountCents, -100_000);
  });

  it('finalise with partial tenant charges → partial refund, zero balance', async () => {
    seedLandlordTrustLease({ withDeposit: 100_000 });
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    await offboarding.addMoveOutCharge(ctxAdmin(), c.id, {
      label: 'Cleaning',
      amountCents: 30_000,
      responsibility: 'TENANT',
    });
    const settlement = await offboarding.finaliseDepositSettlement(ctxAdmin(), c.id);
    assert.equal(settlement.chargesAppliedCents, 30_000);
    assert.equal(settlement.refundDueCents, 70_000);
    assert.equal(settlement.balanceOwedCents, 0);
    const ledger = [...ledgerRows.values()];
    assert.equal(ledger.length, 1);
    assert.equal(ledger[0].amountCents, -70_000);
  });

  it('finalise with charges exceeding deposit → no refund, balance owed, no ledger entry', async () => {
    seedLandlordTrustLease({ withDeposit: 50_000 });
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    await offboarding.addMoveOutCharge(ctxAdmin(), c.id, {
      label: 'Major repair',
      amountCents: 80_000,
      responsibility: 'TENANT',
    });
    const settlement = await offboarding.finaliseDepositSettlement(ctxAdmin(), c.id);
    assert.equal(settlement.chargesAppliedCents, 50_000);
    assert.equal(settlement.refundDueCents, 0);
    assert.equal(settlement.balanceOwedCents, 30_000);
    assert.equal(ledgerRows.size, 0);
  });

  it('LANDLORD and SHARED charges do not reduce the deposit refund', async () => {
    seedLandlordTrustLease({ withDeposit: 100_000 });
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    await offboarding.addMoveOutCharge(ctxAdmin(), c.id, { label: 'A', amountCents: 20_000, responsibility: 'LANDLORD' });
    await offboarding.addMoveOutCharge(ctxAdmin(), c.id, { label: 'B', amountCents: 20_000, responsibility: 'SHARED' });
    const settlement = await offboarding.finaliseDepositSettlement(ctxAdmin(), c.id);
    assert.equal(settlement.refundDueCents, 100_000);
  });

  it('second finalise call is rejected as immutable', async () => {
    seedLandlordTrustLease();
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    await offboarding.finaliseDepositSettlement(ctxAdmin(), c.id);
    await assert.rejects(() => offboarding.finaliseDepositSettlement(ctxAdmin(), c.id), /already finalised/);
  });

  it('charge add/remove rejected after finalisation', async () => {
    seedLandlordTrustLease();
    const c = await offboarding.openOffboardingCase(ctxAdmin(), 'l-1');
    const ch = await offboarding.addMoveOutCharge(ctxAdmin(), c.id, {
      label: 'X', amountCents: 1_000, responsibility: 'TENANT',
    });
    await offboarding.finaliseDepositSettlement(ctxAdmin(), c.id);
    await assert.rejects(() => offboarding.addMoveOutCharge(ctxAdmin(), c.id, {
      label: 'Y', amountCents: 500, responsibility: 'TENANT',
    }), /finalised/);
    await assert.rejects(() => offboarding.removeMoveOutCharge(ctxAdmin(), ch.id), /finalised/);
  });
});
