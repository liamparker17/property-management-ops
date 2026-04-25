import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

let db: any;
let getStaffCommandCenter: any;

let originalOrgSnapshotFindFirst: any;
let originalOrgSnapshotFindMany: any;
let originalLandlordSnapshotAggregate: any;
let originalLandlordSnapshotGroupBy: any;
let originalInvoiceLineItemAggregate: any;
let originalAllocationAggregate: any;
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
  originalLandlordSnapshotGroupBy = db.landlordMonthlySnapshot.groupBy;
  originalInvoiceLineItemAggregate = db.invoiceLineItem.aggregate;
  originalAllocationAggregate = db.allocation.aggregate;
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
  db.landlordMonthlySnapshot.groupBy = originalLandlordSnapshotGroupBy;
  db.invoiceLineItem.aggregate = originalInvoiceLineItemAggregate;
  db.allocation.aggregate = originalAllocationAggregate;
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
  db.landlordMonthlySnapshot.groupBy = async () => [];
  db.invoiceLineItem = db.invoiceLineItem ?? {};
  db.invoiceLineItem.aggregate = async () => ({ _sum: { amountCents: 0 } });
  db.allocation = db.allocation ?? {};
  db.allocation.aggregate = async () => ({ _sum: { amountCents: 0 } });
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

describe('getStaffCommandCenter — kpiSparks', () => {
  beforeEach(() => {
    db.orgMonthlySnapshot.findMany = async (args: any) => {
      const periodTo = args.where.periodStart.lte as Date;
      const months: Date[] = [];
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(Date.UTC(periodTo.getUTCFullYear(), periodTo.getUTCMonth() - i, 1));
        months.push(d);
      }
      return months.map((periodStart, idx) => ({
        orgId: ORG_ID,
        periodStart,
        occupiedUnits: 17 + (idx % 3),
        totalUnits: 20,
        arrearsCents: 5_000_00 + idx * 100_00,
        billedCents: 1_000_000_00 + idx * 10_000_00,
        collectedCents: 950_000_00 + idx * 9_500_00,
        trustBalanceCents: 400_000_00,
        unallocatedCents: 0,
        openMaintenance: 10,
        expiringLeases30: 2,
        blockedApprovals: 0,
      }));
    };
  });

  it('returns a 12-element series for each headline KPI', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    for (const id of ['OCCUPANCY_PCT', 'ARREARS_CENTS', 'COLLECTION_RATE', 'TRUST_BALANCE', 'RENT_BILLED', 'RENT_COLLECTED'] as const) {
      assert.ok(result.kpiSparks[id], `missing kpiSparks.${id}`);
      assert.equal(result.kpiSparks[id]!.length, 12, `${id} series length`);
    }
  });

  it('OCCUPANCY_PCT series values are bounded 0..100', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    for (const v of result.kpiSparks.OCCUPANCY_PCT!) {
      assert.ok(v >= 0 && v <= 100, `out-of-range pct ${v}`);
    }
  });
});

describe('getStaffCommandCenter — collectionsCombo', () => {
  it('returns a combo-chart payload with x, bars (billed), line (collected), and priorLine when 24mo of snapshots exist', async () => {
    db.orgMonthlySnapshot.findMany = async (args: any) => {
      const lte = args.where.periodStart.lte as Date;
      const gte = args.where.periodStart.gte as Date;
      const months: Date[] = [];
      const cursor = new Date(gte);
      while (cursor <= lte) {
        months.push(new Date(cursor));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return months.map((periodStart, idx) => ({
        orgId: ORG_ID,
        periodStart,
        occupiedUnits: 18, totalUnits: 20,
        arrearsCents: 0,
        billedCents: 1_000_000_00 + idx * 1_000_00,
        collectedCents: 900_000_00 + idx * 1_000_00,
        trustBalanceCents: 0, unallocatedCents: 0,
        openMaintenance: 0, expiringLeases30: 0, blockedApprovals: 0,
      }));
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.ok(Array.isArray(result.collectionsCombo), 'collectionsCombo array');
    assert.ok(result.collectionsCombo.length >= 1);
    const last = result.collectionsCombo.at(-1)!;
    assert.equal(typeof last.x, 'string');
    assert.equal(typeof last.bars, 'number');
    assert.equal(typeof last.line, 'number');
    assert.ok(result.collectionsCombo.some((p: any) => typeof p.priorLine === 'number'));
  });
});

describe('getStaffCommandCenter — compare filter', () => {
  it('suppresses priorLine when compare=off', async () => {
    db.orgMonthlySnapshot.findMany = async (args: any) => {
      const lte = args.where.periodStart.lte as Date;
      const gte = args.where.periodStart.gte as Date;
      const months: Date[] = [];
      const cursor = new Date(gte);
      while (cursor <= lte) {
        months.push(new Date(cursor));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return months.map((periodStart, idx) => ({
        orgId: ORG_ID,
        periodStart,
        occupiedUnits: 18, totalUnits: 20,
        arrearsCents: 0,
        billedCents: 1_000_000_00 + idx * 1_000_00,
        collectedCents: 900_000_00 + idx * 1_000_00,
        trustBalanceCents: 0, unallocatedCents: 0,
        openMaintenance: 0, expiringLeases30: 0, blockedApprovals: 0,
      }));
    };
    const result = await getStaffCommandCenter(ROUTE_CTX, { compare: 'off' });
    assert.ok(result.collectionsCombo.length >= 1);
    for (const point of result.collectionsCombo) {
      assert.equal((point as any).priorLine, undefined, 'priorLine must be absent when compare=off');
    }
  });

  it('keeps priorLine when compare=prior (default behaviour preserved)', async () => {
    db.orgMonthlySnapshot.findMany = async (args: any) => {
      const lte = args.where.periodStart.lte as Date;
      const gte = args.where.periodStart.gte as Date;
      const months: Date[] = [];
      const cursor = new Date(gte);
      while (cursor <= lte) {
        months.push(new Date(cursor));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return months.map((periodStart, idx) => ({
        orgId: ORG_ID,
        periodStart,
        occupiedUnits: 18, totalUnits: 20,
        arrearsCents: 0,
        billedCents: 1_000_000_00 + idx * 1_000_00,
        collectedCents: 900_000_00 + idx * 1_000_00,
        trustBalanceCents: 0, unallocatedCents: 0,
        openMaintenance: 0, expiringLeases30: 0, blockedApprovals: 0,
      }));
    };
    const result = await getStaffCommandCenter(ROUTE_CTX, { compare: 'prior' });
    assert.ok(result.collectionsCombo.some((p: any) => typeof p.priorLine === 'number'));
  });
});

describe('getStaffCommandCenter — arrearsAging', () => {
  it('returns 4 aging buckets summed from overdue invoices', async () => {
    const now = new Date();
    db.property.findMany = async () => [{ id: 'p1', name: 'P', addressLine1: '', suburb: '', city: '', province: 'GP', latitude: null, longitude: null, landlord: null, assignedAgent: null }];
    db.invoice.findMany = async () => [
      { id: 'i1', totalCents: 10_000_00, amountCents: 10_000_00, dueDate: new Date(now.getTime() - 10 * 86400000), paidAt: null, status: 'OVERDUE',
        leaseId: 'l1', lease: { unit: { property: { name: 'A' }, label: '1' }, tenants: [{ tenant: { firstName: 'A', lastName: 'A' } }] } },
      { id: 'i2', totalCents: 20_000_00, amountCents: 20_000_00, dueDate: new Date(now.getTime() - 45 * 86400000), paidAt: null, status: 'OVERDUE',
        leaseId: 'l2', lease: { unit: { property: { name: 'B' }, label: '2' }, tenants: [{ tenant: { firstName: 'B', lastName: 'B' } }] } },
      { id: 'i3', totalCents: 30_000_00, amountCents: 30_000_00, dueDate: new Date(now.getTime() - 75 * 86400000), paidAt: null, status: 'OVERDUE',
        leaseId: 'l3', lease: { unit: { property: { name: 'C' }, label: '3' }, tenants: [{ tenant: { firstName: 'C', lastName: 'C' } }] } },
      { id: 'i4', totalCents: 40_000_00, amountCents: 40_000_00, dueDate: new Date(now.getTime() - 120 * 86400000), paidAt: null, status: 'OVERDUE',
        leaseId: 'l4', lease: { unit: { property: { name: 'D' }, label: '4' }, tenants: [{ tenant: { firstName: 'D', lastName: 'D' } }] } },
    ];
    const result = await getStaffCommandCenter(ROUTE_CTX);
    const ids = result.arrearsAging.map((s: any) => s.id);
    assert.deepEqual(ids, ['0-30', '31-60', '61-90', '90+']);
    const byId = Object.fromEntries(result.arrearsAging.map((s: any) => [s.id, s.cents]));
    assert.equal(byId['0-30'], 10_000_00);
    assert.equal(byId['31-60'], 20_000_00);
    assert.equal(byId['61-90'], 30_000_00);
    assert.equal(byId['90+'], 40_000_00);
  });
});

describe('getStaffCommandCenter — occupancyBreakdown', () => {
  it('returns occupied/vacant counts from the current org snapshot', async () => {
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.occupancyBreakdown.occupied, 18);
    assert.equal(result.occupancyBreakdown.vacant, 2);
    assert.equal(result.occupancyBreakdown.total, 20);
  });
});

describe('getStaffCommandCenter — maintenanceSpendTrend', () => {
  it('returns a 12-month trend summed from landlord snapshots', async () => {
    db.landlordMonthlySnapshot.groupBy = async (args: any) => {
      const lte = args.where.periodStart.lte as Date;
      const gte = args.where.periodStart.gte as Date;
      const months: Date[] = [];
      const cursor = new Date(gte);
      while (cursor <= lte) {
        months.push(new Date(cursor));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
      return months.map((d, idx) => ({
        periodStart: d,
        _sum: { maintenanceSpendCents: 5_000_00 + idx * 1_000_00 },
      }));
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.maintenanceSpendTrend.length, 12);
    for (const point of result.maintenanceSpendTrend) {
      assert.equal(typeof point.x, 'string');
      assert.equal(typeof point.y, 'number');
    }
  });
});

describe('getStaffCommandCenter — leaseExpiryBuckets', () => {
  beforeEach(() => {
    db.property.findMany = async () => [
      { id: 'p1', name: 'A', latitude: null, longitude: null, suburb: null, city: 'Johannesburg', province: 'GP', addressLine1: '', landlord: null, assignedAgent: null },
    ];
  });
  it('returns 4 expiry buckets counting active leases by days-until-end', async () => {
    const now = new Date();
    db.lease.findMany = async (args: any) => {
      // getLeaseExpiryBuckets uses select: { endDate: true }; getExpiringLeases uses include
      if (args?.select?.endDate) {
        return [
          { endDate: new Date(now.getTime() + 10 * 86400000) },
          { endDate: new Date(now.getTime() + 50 * 86400000) },
          { endDate: new Date(now.getTime() + 50 * 86400000) },
          { endDate: new Date(now.getTime() + 80 * 86400000) },
          { endDate: new Date(now.getTime() + 200 * 86400000) },
        ];
      }
      return [];
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    const byId = Object.fromEntries(result.leaseExpiryBuckets.map((b: any) => [b.id, b.count]));
    assert.equal(byId['0-30'], 1);
    assert.equal(byId['31-60'], 2);
    assert.equal(byId['61-90'], 1);
    assert.equal(byId['90+'], 1);
  });
});

describe('getStaffCommandCenter — urgentMaintenanceList', () => {
  it('returns the top 5 OPEN/IN_PROGRESS HIGH/URGENT requests', async () => {
    db.property.findMany = async () => [
      { id: 'p1', name: 'A', latitude: null, longitude: null, suburb: null, city: 'Johannesburg', province: 'GP', addressLine1: '', landlord: null, assignedAgent: null },
    ];
    db.maintenanceRequest.findMany = async (args: any) => {
      // Only assert on the urgent-maintenance call (which has priority filter)
      if (args?.where?.priority) {
        assert.deepEqual(args.where.priority, { in: ['HIGH', 'URGENT'] });
        assert.deepEqual(args.where.status, { in: ['OPEN', 'IN_PROGRESS'] });
        return [
          { id: 'm1', title: 'Burst geyser', priority: 'URGENT', status: 'OPEN', scheduledFor: null, unit: { label: '12B', property: { name: 'Acme Tower' } } },
          { id: 'm2', title: 'Power out', priority: 'HIGH', status: 'IN_PROGRESS', scheduledFor: null, unit: { label: '5A', property: { name: 'Beta House' } } },
        ];
      }
      return [];
    };
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.urgentMaintenanceList.length, 2);
    assert.equal(result.urgentMaintenanceList[0].title, 'Burst geyser');
  });
});

describe('getStaffCommandCenter — utilityRecovery', () => {
  it('returns billedCents and collectedCents totals from utility line items', async () => {
    db.property.findMany = async () => [
      { id: 'p1', name: 'A', latitude: null, longitude: null, suburb: null, city: 'Johannesburg', province: 'GP', addressLine1: '', landlord: null, assignedAgent: null },
    ];
    db.invoiceLineItem.aggregate = async (args: any) => {
      const isUtilityKind = (args.where.kind as any).in?.every((k: string) => k.startsWith('UTILITY_'));
      assert.ok(isUtilityKind, 'where.kind must filter on UTILITY_*');
      return { _sum: { amountCents: 200_000_00 } };
    };
    db.allocation.aggregate = async () => ({ _sum: { amountCents: 145_000_00 } });
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.utilityRecovery.billedCents, 200_000_00);
    assert.equal(result.utilityRecovery.collectedCents, 145_000_00);
    assert.equal(result.utilityRecovery.shortfallCents, 55_000_00);
  });
});

describe('getStaffCommandCenter — topArrears.fraction', () => {
  it('attaches a fraction (0..1) to each row, with the largest = 1', async () => {
    db.property.findMany = async () => [
      { id: 'p1', name: 'A', latitude: null, longitude: null, suburb: null, city: 'Johannesburg', province: 'GP', addressLine1: '', landlord: null, assignedAgent: null },
    ];
    db.invoice.findMany = async () => [
      { id: 'i1', totalCents: 100_000_00, amountCents: 100_000_00, leaseId: 'l1', dueDate: new Date(), status: 'OVERDUE', paidAt: null,
        lease: { unit: { property: { name: 'A' }, label: '1' }, tenants: [{ tenant: { firstName: 'Alice', lastName: 'L' } }] } },
      { id: 'i2', totalCents: 50_000_00, amountCents: 50_000_00, leaseId: 'l2', dueDate: new Date(), status: 'OVERDUE', paidAt: null,
        lease: { unit: { property: { name: 'B' }, label: '2' }, tenants: [{ tenant: { firstName: 'Bob', lastName: 'M' } }] } },
    ];
    const result = await getStaffCommandCenter(ROUTE_CTX);
    assert.equal(result.topArrears[0].fraction, 1);
    assert.equal(result.topArrears[1].fraction, 0.5);
  });
});
