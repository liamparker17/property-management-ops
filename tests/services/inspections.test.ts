import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');
process.env.BLOB_READ_WRITE_TOKEN ??= 'test-token';

let db: any;
let inspections: any;

const leaseRows = new Map<string, any>();
const unitRows = new Map<string, any>();
const propertyRows = new Map<string, any>();
const orgRows = new Map<string, any>();
const userRows = new Map<string, any>();
const inspectionRows = new Map<string, any>();
const areaRows = new Map<string, any>();
const itemRows = new Map<string, any>();
const photoRows = new Map<string, any>();
const signatureRows = new Map<string, any>();
const auditCalls: any[] = [];
const blobUploads: any[] = [];

const originals: Record<string, any> = {};

function ctxAdmin() {
  return { orgId: 'org-1', userId: 'u-1', role: 'ADMIN' as const };
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

  save('lease.findFirst', db.lease.findFirst);
  save('inspection.findFirst', db.inspection.findFirst);
  save('inspection.findMany', db.inspection.findMany);
  save('inspection.findUnique', db.inspection.findUnique);
  save('inspection.create', db.inspection.create);
  save('inspection.update', db.inspection.update);
  save('inspectionArea.findFirst', db.inspectionArea.findFirst);
  save('inspectionArea.create', db.inspectionArea.create);
  save('inspectionItem.create', db.inspectionItem.create);
  save('inspectionSignature.create', db.inspectionSignature.create);
  save('user.findUnique', db.user.findUnique);
  save('auditLog.create', db.auditLog.create);

  db.lease.findFirst = async ({ where }: any) => {
    const row = leaseRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.inspection.findFirst = async ({ where }: any) => {
    const row = inspectionRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.inspection.findMany = async ({ where }: any) => {
    return [...inspectionRows.values()].filter((r) => {
      if (where.orgId && r.orgId !== where.orgId) return false;
      if (where.leaseId && r.leaseId !== where.leaseId) return false;
      if (where.unitId && r.unitId !== where.unitId) return false;
      if (where.type && r.type !== where.type) return false;
      if (where.status && r.status !== where.status) return false;
      return true;
    });
  };
  db.inspection.findUnique = async ({ where, include }: any) => {
    const row = inspectionRows.get(where.id);
    if (!row) return null;
    if (!include) return row;
    const org = orgRows.get(row.orgId);
    const lease = leaseRows.get(row.leaseId);
    const unit = unitRows.get(row.unitId);
    const property = unit ? propertyRows.get(unit.propertyId) : null;
    const areas = [...areaRows.values()]
      .filter((a) => a.inspectionId === row.id)
      .map((a) => ({
        ...a,
        items: [...itemRows.values()]
          .filter((it) => it.areaId === a.id)
          .map((it) => ({
            ...it,
            photos: [...photoRows.values()].filter((p) => p.itemId === it.id),
          })),
      }));
    const signatures = [...signatureRows.values()].filter((s) => s.inspectionId === row.id);
    return {
      ...row,
      org: org ? { name: org.name } : { name: '' },
      lease: lease ? { id: lease.id } : { id: row.leaseId },
      unit: unit
        ? { label: unit.label, property: { name: property?.name ?? '' } }
        : { label: '', property: { name: '' } },
      areas,
      signatures,
    };
  };
  db.inspection.create = async ({ data }: any) => {
    const id = `ins-${inspectionRows.size + 1}`;
    const row = {
      id,
      status: 'SCHEDULED',
      startedAt: null,
      completedAt: null,
      signedOffAt: null,
      staffUserId: null,
      agentId: null,
      summary: null,
      reportKey: null,
      ...data,
    };
    inspectionRows.set(id, row);
    return row;
  };
  db.inspection.update = async ({ where, data }: any) => {
    const row = inspectionRows.get(where.id);
    if (!row) throw new Error('not found');
    Object.assign(row, data);
    return row;
  };
  db.inspectionArea.findFirst = async ({ where }: any) => {
    const row = areaRows.get(where.id);
    if (!row) return null;
    if (where.inspection?.orgId) {
      const ins = inspectionRows.get(row.inspectionId);
      if (!ins || ins.orgId !== where.inspection.orgId) return null;
    }
    return row;
  };
  db.inspectionArea.create = async ({ data }: any) => {
    const id = `area-${areaRows.size + 1}`;
    const row = { id, ...data };
    areaRows.set(id, row);
    return row;
  };
  db.inspectionItem.create = async ({ data }: any) => {
    const id = `item-${itemRows.size + 1}`;
    const row = { id, note: null, estimatedCostCents: null, responsibility: null, ...data };
    itemRows.set(id, row);
    return row;
  };
  db.inspectionSignature.create = async ({ data }: any) => {
    const id = `sig-${signatureRows.size + 1}`;
    const row = { id, signedAt: new Date(), ipAddress: null, userAgent: null, ...data };
    signatureRows.set(id, row);
    return row;
  };
  db.user.findUnique = async ({ where }: any) => {
    return userRows.get(where.id) ?? null;
  };
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };

  inspections = (await import('@/lib/services/inspections')) as any;
  inspections.__setUploaderForTests(async (path: string, file: File) => {
    blobUploads.push({ path, size: file.size });
    return { url: `https://blob.example/${path}`, pathname: path };
  });
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  leaseRows.clear();
  unitRows.clear();
  propertyRows.clear();
  orgRows.clear();
  userRows.clear();
  inspectionRows.clear();
  areaRows.clear();
  itemRows.clear();
  photoRows.clear();
  signatureRows.clear();
  auditCalls.length = 0;
  blobUploads.length = 0;
});

function seed() {
  orgRows.set('org-1', { id: 'org-1', name: 'Test Org' });
  propertyRows.set('p-1', { id: 'p-1', orgId: 'org-1', name: 'Rosebank Mews' });
  unitRows.set('u-1', { id: 'u-1', orgId: 'org-1', propertyId: 'p-1', label: 'Unit 1' });
  leaseRows.set('l-1', { id: 'l-1', orgId: 'org-1', unitId: 'u-1' });
  userRows.set('u-1', { id: 'u-1', name: 'Staffer', email: 's@example.com' });
}

async function runThroughComplete(type: 'MOVE_IN' | 'MOVE_OUT' | 'INTERIM') {
  const ctx = ctxAdmin();
  const created = await inspections.createInspection(ctx, {
    leaseId: 'l-1',
    type,
    scheduledAt: new Date('2026-05-01T09:00:00Z').toISOString(),
  });
  assert.equal(created.status, 'SCHEDULED');
  assert.equal(created.unitId, 'u-1');

  const started = await inspections.startInspection(ctx, created.id);
  assert.equal(started.status, 'IN_PROGRESS');
  assert.equal(started.staffUserId, 'u-1');
  assert.ok(started.startedAt instanceof Date);

  const area = await inspections.recordArea(ctx, created.id, { name: 'Kitchen', orderIndex: 0 });
  const item = await inspections.recordItem(ctx, area.id, {
    label: 'Walls',
    condition: 'GOOD',
    estimatedCostCents: 10000,
    responsibility: 'LANDLORD',
  });
  assert.equal(item.areaId, area.id);

  const completed = await inspections.completeInspection(ctx, created.id, {
    summary: 'All good',
  });
  assert.equal(completed.status, 'COMPLETED');
  assert.ok(completed.completedAt instanceof Date);
  assert.ok(completed.reportKey && completed.reportKey.startsWith('inspections/'));
  assert.equal(blobUploads.length, 1);

  return created.id;
}

describe('inspections flow', () => {
  it('MOVE_IN with tenant-only signer flips to SIGNED_OFF', async () => {
    seed();
    const ctx = ctxAdmin();
    const id = await runThroughComplete('MOVE_IN');
    await inspections.signInspection(ctx, id, {
      signerRole: 'TENANT',
      signedName: 'Tenant One',
    });
    const row = inspectionRows.get(id);
    assert.equal(row.status, 'SIGNED_OFF');
    assert.ok(row.signedOffAt instanceof Date);
    const actions = auditCalls.map((a) => a.action);
    assert.ok(actions.includes('inspection.create'));
    assert.ok(actions.includes('inspection.start'));
    assert.ok(actions.includes('inspection.recordArea'));
    assert.ok(actions.includes('inspection.recordItem'));
    assert.ok(actions.includes('inspection.complete'));
    assert.ok(actions.includes('inspection.sign'));
  });

  it('MOVE_OUT with staff-only signer flips to SIGNED_OFF', async () => {
    seed();
    const ctx = ctxAdmin();
    const id = await runThroughComplete('MOVE_OUT');
    await inspections.signInspection(ctx, id, {
      signerRole: 'PROPERTY_MANAGER',
      signedName: 'Staff One',
    });
    const row = inspectionRows.get(id);
    assert.equal(row.status, 'SIGNED_OFF');
    assert.ok(row.signedOffAt instanceof Date);
  });

  it('INTERIM with staff-only signer does NOT flip to SIGNED_OFF', async () => {
    seed();
    const ctx = ctxAdmin();
    const id = await runThroughComplete('INTERIM');
    await inspections.signInspection(ctx, id, {
      signerRole: 'PROPERTY_MANAGER',
      signedName: 'Staff One',
    });
    const row = inspectionRows.get(id);
    assert.equal(row.status, 'COMPLETED');
    assert.equal(row.signedOffAt, null);
  });

  it('INTERIM flips only when tenant signs', async () => {
    seed();
    const ctx = ctxAdmin();
    const id = await runThroughComplete('INTERIM');
    await inspections.signInspection(ctx, id, {
      signerRole: 'PROPERTY_MANAGER',
      signedName: 'Staff One',
    });
    assert.equal(inspectionRows.get(id).status, 'COMPLETED');
    await inspections.signInspection(ctx, id, {
      signerRole: 'TENANT',
      signedName: 'Tenant One',
    });
    const row = inspectionRows.get(id);
    assert.equal(row.status, 'SIGNED_OFF');
    assert.ok(row.signedOffAt instanceof Date);
  });
});
