import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let vendors: any;

const vendorRows = new Map<string, any>();
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

  save('vendor.findFirst', db.vendor.findFirst);
  save('vendor.findMany', db.vendor.findMany);
  save('vendor.create', db.vendor.create);
  save('vendor.update', db.vendor.update);
  save('auditLog.create', db.auditLog.create);

  db.vendor.findFirst = async ({ where }: any) => {
    const row = vendorRows.get(where.id);
    if (!row) return null;
    if (where.orgId && row.orgId !== where.orgId) return null;
    return row;
  };
  db.vendor.findMany = async ({ where }: any) => {
    return [...vendorRows.values()].filter((v) => {
      if (where.orgId && v.orgId !== where.orgId) return false;
      if (where.archivedAt === null && v.archivedAt !== null) return false;
      if (where.categories?.has && !v.categories.includes(where.categories.has)) return false;
      return true;
    });
  };
  db.vendor.create = async ({ data }: any) => {
    const id = `v-${vendorRows.size + 1}`;
    const row = {
      id,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [],
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      ...data,
    };
    vendorRows.set(id, row);
    return row;
  };
  db.vendor.update = async ({ where, data }: any) => {
    const row = vendorRows.get(where.id);
    if (!row) throw new Error('Vendor not found');
    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  };
  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `a-${auditCalls.length}`, ...data };
  };

  vendors = (await import('@/lib/services/vendors')) as any;
});

after(async () => {
  restoreAll();
  await db.$disconnect();
});

beforeEach(() => {
  vendorRows.clear();
  auditCalls.length = 0;
});

describe('vendors service', () => {
  it('creates a vendor scoped to the org and writes audit', async () => {
    const ctx = ctxAdmin();
    const v = await vendors.createVendor(ctx, {
      name: 'Acme Plumbing',
      contactName: 'Jane',
      contactEmail: 'jane@acme.test',
      contactPhone: null,
      categories: ['Plumbing'],
    });
    assert.equal(v.orgId, 'org-1');
    assert.equal(v.name, 'Acme Plumbing');
    assert.deepEqual(v.categories, ['Plumbing']);
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].action, 'vendor.create');
  });

  it('lists only active vendors by default and includes archived when requested', async () => {
    const ctx = ctxAdmin();
    const a = await vendors.createVendor(ctx, { name: 'Active', categories: [] });
    const b = await vendors.createVendor(ctx, { name: 'ArchiveMe', categories: [] });
    await vendors.archiveVendor(ctx, b.id);

    const activeOnly = await vendors.listVendors(ctx, {});
    assert.equal(activeOnly.length, 1);
    assert.equal(activeOnly[0].id, a.id);

    const all = await vendors.listVendors(ctx, { includeArchived: true });
    assert.equal(all.length, 2);
  });

  it('updates a vendor and audits the change', async () => {
    const ctx = ctxAdmin();
    const v = await vendors.createVendor(ctx, { name: 'Old', categories: [] });
    auditCalls.length = 0;
    const updated = await vendors.updateVendor(ctx, v.id, { name: 'New' });
    assert.equal(updated.name, 'New');
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].action, 'vendor.update');
  });

  it('archives a vendor by stamping archivedAt', async () => {
    const ctx = ctxAdmin();
    const v = await vendors.createVendor(ctx, { name: 'X', categories: [] });
    const archived = await vendors.archiveVendor(ctx, v.id);
    assert.ok(archived.archivedAt instanceof Date);
  });

  it('rejects vendor lookup from another org', async () => {
    const ctx = ctxAdmin();
    const v = await vendors.createVendor(ctx, { name: 'One', categories: [] });
    const otherCtx = { orgId: 'org-2', userId: 'u-2', role: 'ADMIN' as const };
    await assert.rejects(() => vendors.getVendor(otherCtx, v.id), /not found/i);
  });
});
