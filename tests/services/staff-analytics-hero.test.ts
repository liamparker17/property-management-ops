import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let getStaffCommandCenter: any;

let originalOrgSnapshotFindFirst: any;
let originalOrgSnapshotFindMany: any;
let originalLandlordSnapshotAggregate: any;
let originalMaintenanceCount: any;
let originalPropertyFindMany: any;
let originalLeaseFindMany: any;
let originalInvoiceFindMany: any;
let originalApprovalFindMany: any;
let originalMaintenanceFindMany: any;
let originalOrgFindUnique: any;

const ORG_ID = 'org_test';
const ROUTE_CTX = { orgId: ORG_ID, userId: 'u1', role: 'ADMIN' as const };

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalOrgSnapshotFindFirst = db.orgMonthlySnapshot.findFirst;
  originalOrgSnapshotFindMany = db.orgMonthlySnapshot.findMany;
  originalLandlordSnapshotAggregate = db.landlordMonthlySnapshot.aggregate;
  originalMaintenanceCount = db.maintenanceRequest.count;
  originalMaintenanceFindMany = db.maintenanceRequest.findMany;
  originalPropertyFindMany = db.property.findMany;
  originalLeaseFindMany = db.lease.findMany;
  originalInvoiceFindMany = db.invoice.findMany;
  originalApprovalFindMany = db.approval.findMany;
  originalOrgFindUnique = db.org.findUnique;

  ({ getStaffCommandCenter } = await import('@/lib/services/staff-analytics'));
});

after(() => {
  db.orgMonthlySnapshot.findFirst = originalOrgSnapshotFindFirst;
  db.orgMonthlySnapshot.findMany = originalOrgSnapshotFindMany;
  db.landlordMonthlySnapshot.aggregate = originalLandlordSnapshotAggregate;
  db.maintenanceRequest.count = originalMaintenanceCount;
  db.maintenanceRequest.findMany = originalMaintenanceFindMany;
  db.property.findMany = originalPropertyFindMany;
  db.lease.findMany = originalLeaseFindMany;
  db.invoice.findMany = originalInvoiceFindMany;
  db.approval.findMany = originalApprovalFindMany;
  db.org.findUnique = originalOrgFindUnique;
});

beforeEach(() => {
  db.orgMonthlySnapshot.findFirst = async (args: any) => {
    const ps = (args.where.periodStart as Date).toISOString();
    const isCurrent = ps.startsWith(new Date().toISOString().slice(0, 7));
    return {
      orgId: ORG_ID,
      periodStart: args.where.periodStart,
      occupiedUnits: 18,
      totalUnits: 20,
      arrearsCents: isCurrent ? 8_300_00 : 7_100_00,
      billedCents: isCurrent ? 1_240_000_00 : 1_148_000_00,
      collectedCents: isCurrent ? 1_152_000_00 : 1_063_000_00,
      trustBalanceCents: 425_000_00,
      unallocatedCents: 12_000_00,
      openMaintenance: 17,
      expiringLeases30: 3,
      blockedApprovals: 1,
    };
  };
  db.orgMonthlySnapshot.findMany = async () => [];
  db.landlordMonthlySnapshot.aggregate = async () => ({ _sum: { maintenanceSpendCents: 92_000_00 } });
  db.maintenanceRequest.count = async () => 4;
  db.maintenanceRequest.findMany = async () => [];
  db.property.findMany = async () => [];
  db.lease.findMany = async () => [];
  db.invoice.findMany = async () => [];
  db.approval.findMany = async () => [];
  db.org.findUnique = async () => ({ expiringWindowDays: 60 });
});

describe('getStaffCommandCenter — Phase 1 hero KPIs', () => {
  it('returns RENT_BILLED equal to OrgMonthlySnapshot.billedCents', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.kpis.RENT_BILLED, 1_240_000_00);
    assert.equal(result.priorKpis.RENT_BILLED, 1_148_000_00);
  });

  it('returns RENT_COLLECTED equal to OrgMonthlySnapshot.collectedCents', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.kpis.RENT_COLLECTED, 1_152_000_00);
  });

  it('returns NET_RENTAL_INCOME = collectedCents − landlord maintenanceSpendCents', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.kpis.NET_RENTAL_INCOME, 1_152_000_00 - 92_000_00);
  });

  it('returns URGENT_MAINTENANCE from a live maintenanceRequest count', async () => {
    let observedWhere: any = null;
    db.maintenanceRequest.count = async (args: any) => {
      observedWhere = args.where;
      return 4;
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.kpis.URGENT_MAINTENANCE, 4);
    assert.deepEqual(observedWhere.priority, { in: ['HIGH', 'URGENT'] });
    assert.deepEqual(observedWhere.status, { in: ['OPEN', 'IN_PROGRESS'] });
    assert.equal(observedWhere.orgId, ORG_ID);
  });
});
