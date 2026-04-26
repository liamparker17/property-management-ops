import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let getArrearsAgingDetail: any;
let getTopOverdueDetail: any;
let getLeaseExpiriesDetail: any;
let getUrgentMaintenanceDetail: any;
let originalInvoiceFindMany: any;
let originalLeaseFindMany: any;
let originalMaintenanceFindMany: any;
let originalPropertyFindMany: any;

const ORG_ID = 'org_drill';
const ROUTE_CTX = { orgId: ORG_ID, userId: 'u', role: 'ADMIN' as const };

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalInvoiceFindMany = db.invoice.findMany;
  originalLeaseFindMany = db.lease.findMany;
  originalMaintenanceFindMany = db.maintenanceRequest.findMany;
  originalPropertyFindMany = db.property.findMany;
  ({ getArrearsAgingDetail, getTopOverdueDetail, getLeaseExpiriesDetail, getUrgentMaintenanceDetail } = await import('@/lib/services/staff-analytics'));
});

after(() => {
  db.invoice.findMany = originalInvoiceFindMany;
  db.lease.findMany = originalLeaseFindMany;
  db.maintenanceRequest.findMany = originalMaintenanceFindMany;
  db.property.findMany = originalPropertyFindMany;
});

beforeEach(() => {
  db.property.findMany = async () => [{ id: 'p1', name: 'P1', latitude: null, longitude: null, suburb: null, city: 'Johannesburg', province: 'GP', addressLine1: '', landlord: null, assignedAgent: null }];
});

describe('drill server functions', () => {
  it('getArrearsAgingDetail returns rows grouped by 4 buckets', async () => {
    const now = new Date();
    db.invoice.findMany = async () => [
      { id: 'i1', totalCents: 10_000_00, amountCents: 10_000_00, dueDate: new Date(now.getTime() - 10 * 86400000),
        leaseId: 'l1', lease: { unit: { property: { name: 'A' }, label: '1' }, tenants: [{ tenant: { firstName: 'A', lastName: 'B' } }] } },
      { id: 'i2', totalCents: 20_000_00, amountCents: 20_000_00, dueDate: new Date(now.getTime() - 100 * 86400000),
        leaseId: 'l2', lease: { unit: { property: { name: 'C' }, label: '2' }, tenants: [{ tenant: { firstName: 'C', lastName: 'D' } }] } },
    ];
    const result = await getArrearsAgingDetail(ROUTE_CTX);
    assert.equal(result.buckets.length, 4);
    const idsToCount = Object.fromEntries(result.buckets.map((b: any) => [b.id, b.rows.length]));
    assert.equal(idsToCount['0-30'], 1);
    assert.equal(idsToCount['90+'], 1);
  });

  it('getTopOverdueDetail returns all overdue rows (no take limit)', async () => {
    db.invoice.findMany = async (args: any) => {
      assert.equal(args.take, undefined, 'no take limit');
      return Array.from({ length: 25 }, (_, i) => ({
        id: `i${i}`, totalCents: (25 - i) * 1_000_00, amountCents: (25 - i) * 1_000_00, dueDate: new Date(),
        leaseId: `l${i}`, lease: { unit: { property: { name: 'A' }, label: '1' }, tenants: [{ tenant: { firstName: 'A', lastName: 'B' } }] },
      }));
    };
    const result = await getTopOverdueDetail(ROUTE_CTX);
    assert.equal(result.rows.length, 25);
  });

  it('getLeaseExpiriesDetail returns rows grouped by 4 buckets with lease info', async () => {
    const now = new Date();
    db.lease.findMany = async () => [
      { id: 'l1', endDate: new Date(now.getTime() + 15 * 86400000), unit: { label: '1', property: { name: 'A' } }, tenants: [{ tenant: { firstName: 'A', lastName: 'B' } }] },
      { id: 'l2', endDate: new Date(now.getTime() + 200 * 86400000), unit: { label: '2', property: { name: 'C' } }, tenants: [{ tenant: { firstName: 'C', lastName: 'D' } }] },
    ];
    const result = await getLeaseExpiriesDetail(ROUTE_CTX);
    assert.equal(result.buckets.length, 4);
    const idsToCount = Object.fromEntries(result.buckets.map((b: any) => [b.id, b.rows.length]));
    assert.equal(idsToCount['0-30'], 1);
    assert.equal(idsToCount['90+'], 1);
  });

  it('getUrgentMaintenanceDetail returns all (no take limit)', async () => {
    db.maintenanceRequest.findMany = async (args: any) => {
      assert.equal(args.take, undefined, 'no take limit');
      return Array.from({ length: 12 }, (_, i) => ({
        id: `m${i}`, title: `t${i}`, priority: 'URGENT', status: 'OPEN', scheduledFor: null, createdAt: new Date(),
        unit: { label: '1', property: { name: 'A' } }, vendor: null,
      }));
    };
    const result = await getUrgentMaintenanceDetail(ROUTE_CTX);
    assert.equal(result.rows.length, 12);
  });
});

describe('getPropertyDetailDrill', () => {
  let originalPropertyFindUnique: any;
  let originalSnapshotFindFirst: any;

  before(() => {
    originalPropertyFindUnique = db.property.findUnique;
    originalSnapshotFindFirst = db.propertyMonthlySnapshot?.findFirst;
  });

  after(() => {
    db.property.findUnique = originalPropertyFindUnique;
    if (db.propertyMonthlySnapshot) db.propertyMonthlySnapshot.findFirst = originalSnapshotFindFirst;
  });

  it('returns property identity + KPIs + recent expiring leases + recent maintenance', async () => {
    db.property.findUnique = async ({ where }: any) => ({
      id: where.id,
      name: 'Tower A',
      suburb: 'Sandhurst',
      city: 'Johannesburg',
      province: 'GP',
      orgId: ORG_ID,
      deletedAt: null,
    });
    db.propertyMonthlySnapshot.findFirst = async () => ({
      orgId: ORG_ID,
      propertyId: 'p1',
      periodStart: new Date(),
      occupiedUnits: 9,
      totalUnits: 10,
      openMaintenance: 1,
      arrearsCents: 0,
      grossRentCents: 100_000_00,
    });
    db.lease.findMany = async () => [
      { id: 'l1', endDate: new Date(Date.now() + 20 * 86400000), unit: { label: '1', property: { name: 'Tower A' } }, tenants: [{ tenant: { firstName: 'A', lastName: 'B' } }] },
    ];
    db.maintenanceRequest.findMany = async () => [
      { id: 'm1', title: 'Burst geyser', priority: 'URGENT', status: 'OPEN', unit: { property: { id: 'p1' } } },
    ];
    const result = await (await import('@/lib/services/staff-analytics')).getPropertyDetailDrill(ROUTE_CTX, 'p1');
    assert.equal(result.property.id, 'p1');
    assert.equal(result.property.name, 'Tower A');
    assert.equal(result.kpis.occupancyPct, 90);
    assert.ok(typeof result.kpis.healthScore === 'number');
    assert.equal(result.recentExpiringLeases.length, 1);
    assert.equal(result.recentMaintenance.length, 1);
  });
});
