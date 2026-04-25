import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let getStaffPortfolio: any;
let originalSnapshotFindMany: any;
let originalPropertyFindMany: any;
let originalMaintenanceCount: any;
let originalLeaseFindMany: any;

const ORG_ID = 'org_p2a';
const ROUTE_CTX = { orgId: ORG_ID, userId: 'u', role: 'ADMIN' as const };

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalSnapshotFindMany = db.propertyMonthlySnapshot.findMany;
  originalPropertyFindMany = db.property.findMany;
  originalMaintenanceCount = db.maintenanceRequest.count;
  originalLeaseFindMany = db.lease.findMany;
  ({ getStaffPortfolio } = await import('@/lib/services/staff-analytics'));
});

after(() => {
  db.propertyMonthlySnapshot.findMany = originalSnapshotFindMany;
  db.property.findMany = originalPropertyFindMany;
  db.maintenanceRequest.count = originalMaintenanceCount;
  db.lease.findMany = originalLeaseFindMany;
});

beforeEach(() => {
  db.property.findMany = async () => [
    { id: 'p1', name: 'Tower A', addressLine1: '', suburb: 's', city: 'Johannesburg', province: 'GP', latitude: null, longitude: null,
      landlord: { id: 'l1', name: 'L1' }, assignedAgent: null },
  ];
  db.propertyMonthlySnapshot.findMany = async () => [
    { orgId: ORG_ID, propertyId: 'p1', periodStart: new Date(), occupiedUnits: 9, totalUnits: 10, openMaintenance: 1, arrearsCents: 0, grossRentCents: 100_000_00 },
  ];
  db.maintenanceRequest.count = async () => 0;
  db.lease.findMany = async () => [];
});

describe('getStaffPortfolio — healthScore', () => {
  it('attaches a healthScore in 0..100 to each row', async () => {
    const result = await getStaffPortfolio(ROUTE_CTX);
    const row = result.rows[0];
    assert.ok(typeof row.healthScore === 'number', 'healthScore is a number');
    assert.ok(row.healthScore >= 0 && row.healthScore <= 100);
  });

  it('weights occupancy — score drops when occupancy drops', async () => {
    const r1 = await getStaffPortfolio(ROUTE_CTX);
    const high = r1.rows[0].healthScore;
    db.propertyMonthlySnapshot.findMany = async () => [
      { orgId: ORG_ID, propertyId: 'p1', periodStart: new Date(), occupiedUnits: 5, totalUnits: 10, openMaintenance: 1, arrearsCents: 0, grossRentCents: 100_000_00 },
    ];
    const r2 = await getStaffPortfolio(ROUTE_CTX);
    assert.ok(r2.rows[0].healthScore < high);
  });
});
