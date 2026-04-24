import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let maintenance: any;

const maintenanceRows = new Map<string, any>();
const vendorRows = new Map<string, any>();
const quoteRows = new Map<string, any>();
const worklogRows = new Map<string, any>();
const unitRows = new Map<string, any>();
const propertyRows = new Map<string, any>();
const landlordRows = new Map<string, any>();
const trustAccountRows = new Map<string, any>();
const ledgerRows = new Map<string, any>();
const auditCalls: any[] = [];

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

  save('maintenanceRequest.findFirst', db.maintenanceRequest.findFirst);
  save('maintenanceRequest.update', db.maintenanceRequest.update);
  save('vendor.findFirst', db.vendor.findFirst);
  save('maintenanceQuote.create', db.maintenanceQuote.create);
  save('maintenanceWorklog.create', db.maintenanceWorklog.create);
  save('landlord.findFirst', db.landlord.findFirst);
  save('trustAccount.findUnique', db.trustAccount.findUnique);
  save('trustAccount.create', db.trustAccount.create);
  save('trustLedgerEntry.create', db.trustLedgerEntry.create);
  save('auditLog.create', db.auditLog.create);

  db.maintenanceRequest.findFirst = async ({ where, include }: any) => {
    const row = maintenanceRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    if (include?.unit?.select?.property) {
      const unit = unitRows.get(row.unitId);
      const property = propertyRows.get(unit?.propertyId);
      return { ...row, unit: { ...unit, property } };
    }
    return row;
  };
  db.maintenanceRequest.update = async ({ where, data }: any) => {
    const row = maintenanceRows.get(where.id);
    if (!row) throw new Error('not found');
    Object.assign(row, data);
    return row;
  };
  db.vendor.findFirst = async ({ where }: any) => {
    const row = vendorRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.maintenanceQuote.create = async ({ data }: any) => {
    const id = `mq-${quoteRows.size + 1}`;
    const row = { id, createdAt: new Date(), ...data };
    quoteRows.set(id, row);
    return row;
  };
  db.maintenanceWorklog.create = async ({ data }: any) => {
    const id = `mw-${worklogRows.size + 1}`;
    const row = { id, createdAt: new Date(), ...data };
    worklogRows.set(id, row);
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
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };

  maintenance = (await import('@/lib/services/maintenance')) as any;
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  maintenanceRows.clear();
  vendorRows.clear();
  quoteRows.clear();
  worklogRows.clear();
  unitRows.clear();
  propertyRows.clear();
  landlordRows.clear();
  trustAccountRows.clear();
  ledgerRows.clear();
  auditCalls.length = 0;
});

function seed() {
  landlordRows.set('ll-1', { id: 'll-1', orgId: 'org-1', name: 'Landlord One', archivedAt: null });
  propertyRows.set('p-1', { id: 'p-1', orgId: 'org-1', landlordId: 'll-1' });
  unitRows.set('u-1', { id: 'u-1', orgId: 'org-1', propertyId: 'p-1' });
  vendorRows.set('v-1', {
    id: 'v-1',
    orgId: 'org-1',
    name: 'Acme',
    archivedAt: null,
    categories: [],
  });
  maintenanceRows.set('m-1', {
    id: 'm-1',
    orgId: 'org-1',
    tenantId: 't-1',
    unitId: 'u-1',
    title: 'Leaky tap',
    description: 'Drip',
    priority: 'MEDIUM',
    status: 'OPEN',
    assignedVendorId: null,
    estimatedCostCents: null,
    quotedCostCents: null,
    scheduledFor: null,
    completedAt: null,
    invoiceCents: null,
    invoiceBlobKey: null,
    internalNotes: null,
    resolvedAt: null,
  });
}

describe('maintenance dispatch flow', () => {
  it('assignVendor → schedule → complete → captureMaintenanceInvoice posts FEE entry', async () => {
    seed();
    const ctx = ctxAdmin();

    const assigned = await maintenance.assignVendor(ctx, 'm-1', { vendorId: 'v-1' });
    assert.equal(assigned.assignedVendorId, 'v-1');
    assert.equal(assigned.status, 'IN_PROGRESS');
    const assignWorklog = [...worklogRows.values()].find((w) =>
      w.body.includes('Assigned to Acme'),
    );
    assert.ok(assignWorklog, 'expected assignment worklog');

    const scheduled = await maintenance.scheduleMaintenance(ctx, 'm-1', {
      scheduledFor: new Date('2026-05-01T09:00:00Z').toISOString(),
    });
    assert.ok(scheduled.scheduledFor instanceof Date);

    const completed = await maintenance.completeMaintenance(ctx, 'm-1', {
      summary: 'Replaced washer',
    });
    assert.equal(completed.status, 'RESOLVED');
    assert.ok(completed.completedAt instanceof Date);

    const posted = await maintenance.captureMaintenanceInvoice(ctx, 'm-1', {
      invoiceCents: 25000,
    });
    assert.equal(posted.invoiceCents, 25000);

    const feeEntries = [...ledgerRows.values()].filter((e) => e.type === 'FEE');
    assert.equal(feeEntries.length, 1);
    assert.equal(feeEntries[0].amountCents, -25000);
    assert.equal(feeEntries[0].landlordId, 'll-1');
    assert.equal(feeEntries[0].sourceType, 'MaintenanceRequest');
    assert.equal(feeEntries[0].sourceId, 'm-1');

    const actions = auditCalls.map((a) => a.action);
    assert.ok(actions.includes('maintenance.assignVendor'));
    assert.ok(actions.includes('maintenance.schedule'));
    assert.ok(actions.includes('maintenance.complete'));
    assert.ok(actions.includes('maintenance.captureInvoice'));
  });

  it('scheduleMaintenance requires an assigned vendor', async () => {
    seed();
    const ctx = ctxAdmin();
    await assert.rejects(
      () =>
        maintenance.scheduleMaintenance(ctx, 'm-1', {
          scheduledFor: new Date('2026-05-01T09:00:00Z').toISOString(),
        }),
      /vendor/i,
    );
  });

  it('captureMaintenanceInvoice rejects when property has no landlord', async () => {
    seed();
    propertyRows.set('p-1', { id: 'p-1', orgId: 'org-1', landlordId: null });
    const ctx = ctxAdmin();
    await assert.rejects(
      () => maintenance.captureMaintenanceInvoice(ctx, 'm-1', { invoiceCents: 1000 }),
      /landlord/i,
    );
  });

  it('captureQuote stamps quotedCostCents only when unset', async () => {
    seed();
    const ctx = ctxAdmin();
    await maintenance.captureQuote(ctx, 'm-1', { amountCents: 5000 });
    assert.equal(maintenanceRows.get('m-1').quotedCostCents, 5000);

    await maintenance.captureQuote(ctx, 'm-1', { amountCents: 7000 });
    assert.equal(maintenanceRows.get('m-1').quotedCostCents, 5000);
    assert.equal(quoteRows.size, 2);
  });

  it('addMaintenanceWorklog inserts and audits', async () => {
    seed();
    const ctx = ctxAdmin();
    const entry = await maintenance.addMaintenanceWorklog(ctx, 'm-1', { body: 'Called tenant' });
    assert.equal(entry.body, 'Called tenant');
    assert.equal(entry.authorId, 'u-1');
    assert.ok(auditCalls.some((a) => a.action === 'maintenance.addWorklog'));
  });
});
