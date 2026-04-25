import type { ApprovalKind, MaintenanceStatus } from '@prisma/client';

import type { ChartPoint } from '@/components/analytics/charts/area-chart';
import type { ComboChartPoint } from '@/components/analytics/charts/combo-chart';
import type { PortfolioPin } from '@/components/analytics/maps/portfolio-pins';
import type { KpiId } from '@/lib/analytics/kpis';
import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { withRoleScopeFilter } from '@/lib/services/role-scope';
import {
  monthFloor,
  recomputeOrgSnapshot,
  recomputePropertySnapshot,
} from '@/lib/services/snapshots';

type KpiMap = Record<KpiId, number>;

export type ExpiringLeaseRow = {
  id: string;
  propertyName: string;
  unitLabel: string;
  tenantName: string | null;
  endDate: Date;
  daysUntilExpiry: number;
  href: string;
};

export type ArrearsRow = {
  id: string;
  title: string;
  subtitle: string;
  amountCents: number;
  href: string;
};

export type MaintenanceRow = {
  id: string;
  title: string;
  subtitle: string;
  status: MaintenanceStatus;
  priority: string;
  scheduledFor: Date | null;
  href: string;
};

export type ApprovalRow = {
  id: string;
  kind: ApprovalKind;
  propertyName: string | null;
  requestedAt: Date;
  href: string;
};

export type PropertyAnalyticsRow = {
  id: string;
  name: string;
  suburb: string;
  city: string;
  province: string;
  landlordName: string | null;
  agentName: string | null;
  occupiedUnits: number;
  totalUnits: number;
  occupancyPct: number;
  openMaintenance: number;
  arrearsCents: number;
  grossRentCents: number;
  href: string;
};

export type StaffCommandCenter = {
  periodStart: Date;
  kpis: KpiMap;
  priorKpis: Partial<KpiMap>;
  kpiSparks: Partial<Record<KpiId, number[]>>;
  expiringLeases: ExpiringLeaseRow[];
  topArrears: ArrearsRow[];
  openMaintenance: MaintenanceRow[];
  blockedApprovals: ApprovalRow[];
  portfolioPins: PortfolioPin[];
  collectionsTrend: ChartPoint[];
  collectionsCombo: ComboChartPoint[];
  maintenanceByStatus: ChartPoint[];
};

export type PortfolioView = {
  periodStart: Date;
  rows: PropertyAnalyticsRow[];
  pins: PortfolioPin[];
};

export type FinanceView = {
  periodStart: Date;
  kpis: KpiMap;
  priorKpis: Partial<KpiMap>;
  trend: ChartPoint[];
  arrearsBuckets: ChartPoint[];
  trustBreakdown: { id: string; label: string; y: number }[];
};

export type MaintenanceView = {
  queue: MaintenanceRow[];
  statusCounts: ChartPoint[];
  vendorLeaderboard: { id: string; label: string; value: number; href?: string }[];
  averageCloseDays: number;
};

export type OperationsView = {
  expiring30: ExpiringLeaseRow[];
  expiring60: ExpiringLeaseRow[];
  expiring90: ExpiringLeaseRow[];
  blockedApprovals: ApprovalRow[];
  missingMoveIns: { id: string; label: string; detail: string; href: string }[];
};

const CITY_COORDS: Record<string, [number, number]> = {
  Johannesburg: [-26.2041, 28.0473],
  Sandton: [-26.1076, 28.0567],
  Pretoria: [-25.7479, 28.2293],
  Centurion: [-25.8603, 28.1881],
  CapeTown: [-33.9249, 18.4241],
  Durban: [-29.8587, 31.0218],
  Gqeberha: [-33.9608, 25.6022],
  PortElizabeth: [-33.9608, 25.6022],
  Bloemfontein: [-29.0852, 26.1596],
};

function addMonths(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function keyForMonth(date: Date) {
  return date.toISOString().slice(0, 10);
}

function labelForMonth(date: Date) {
  return date.toLocaleString('en-ZA', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)));
}

function hashStringToUnit(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

function resolveCityAnchor(city: string | null): [number, number] | null {
  if (!city) return null;
  const key = city.replaceAll(/\s+/g, '');
  return CITY_COORDS[key] ?? null;
}

function buildPropertyPin(
  property: {
    id: string;
    name: string;
    city: string | null;
    suburb: string | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  _index: number,
): PortfolioPin | null {
  if (typeof property.latitude === 'number' && typeof property.longitude === 'number') {
    return {
      id: property.id,
      label: property.name,
      lat: property.latitude,
      lng: property.longitude,
      href: `/properties/${property.id}`,
      meta: [property.suburb, property.city].filter(Boolean).join(', ') || undefined,
    };
  }
  const anchor = resolveCityAnchor(property.city);
  if (!anchor) return null;
  const latJitter = (hashStringToUnit(`${property.id}:lat`) - 0.5) * 0.04;
  const lngJitter = (hashStringToUnit(`${property.id}:lng`) - 0.5) * 0.04;
  return {
    id: property.id,
    label: property.name,
    lat: anchor[0] + latJitter,
    lng: anchor[1] + lngJitter,
    href: `/properties/${property.id}`,
    meta: [property.suburb, property.city].filter(Boolean).join(', ') || undefined,
  };
}

async function getScopedProperties(ctx: RouteCtx, propertyId?: string) {
  return db.property.findMany({
    where: withRoleScopeFilter(ctx, {
      deletedAt: null,
      ...(propertyId ? { id: propertyId } : {}),
    }),
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      addressLine1: true,
      suburb: true,
      city: true,
      province: true,
      latitude: true,
      longitude: true,
      landlord: { select: { id: true, name: true } },
      assignedAgent: { select: { id: true, name: true } },
    },
  });
}

async function getPropertyIds(ctx: RouteCtx, propertyId?: string) {
  const rows = await getScopedProperties(ctx, propertyId);
  return rows.map((row) => row.id);
}

async function getOrgSnapshotSeries(ctx: RouteCtx, periodStart: Date, months = 12) {
  const from = addMonths(periodStart, -(months - 1));
  const rows = await db.orgMonthlySnapshot.findMany({
    where: {
      orgId: ctx.orgId,
      periodStart: { gte: from, lte: periodStart },
    },
    orderBy: { periodStart: 'asc' },
  });
  return rows;
}

function snapshotKpis(snapshot?: {
  occupiedUnits: number;
  totalUnits: number;
  arrearsCents: number;
  billedCents: number;
  collectedCents: number;
  trustBalanceCents: number;
  unallocatedCents: number;
  openMaintenance: number;
  expiringLeases30: number;
  blockedApprovals: number;
}, extra?: { netRentalIncome?: number; urgentMaintenance?: number }) {
  return {
    OCCUPANCY_PCT: percent(snapshot?.occupiedUnits ?? 0, snapshot?.totalUnits ?? 0),
    ARREARS_CENTS: snapshot?.arrearsCents ?? 0,
    COLLECTION_RATE: percent(snapshot?.collectedCents ?? 0, snapshot?.billedCents ?? 0),
    TRUST_BALANCE: snapshot?.trustBalanceCents ?? 0,
    UNALLOCATED_CENTS: snapshot?.unallocatedCents ?? 0,
    OPEN_MAINTENANCE: snapshot?.openMaintenance ?? 0,
    URGENT_MAINTENANCE: extra?.urgentMaintenance ?? 0,
    EXPIRING_LEASES_30: snapshot?.expiringLeases30 ?? 0,
    BLOCKED_APPROVALS: snapshot?.blockedApprovals ?? 0,
    GROSS_RENT: snapshot?.billedCents ?? 0,
    NET_RENTAL_INCOME: extra?.netRentalIncome ?? 0,
    RENT_BILLED: snapshot?.billedCents ?? 0,
    RENT_COLLECTED: snapshot?.collectedCents ?? 0,
    DISBURSED_CENTS: 0,
    MAINTENANCE_SPEND: 0,
    VACANCY_DRAG: 0,
    AGENT_OPEN_TICKETS: 0,
    AGENT_UPCOMING_INSPECTIONS: 0,
  } satisfies KpiMap;
}

function buildKpiSparks(rows: Array<{
  occupiedUnits: number;
  totalUnits: number;
  arrearsCents: number;
  billedCents: number;
  collectedCents: number;
  trustBalanceCents: number;
}>): Partial<Record<KpiId, number[]>> {
  return {
    OCCUPANCY_PCT: rows.map((r) => percent(r.occupiedUnits, r.totalUnits)),
    ARREARS_CENTS: rows.map((r) => r.arrearsCents),
    COLLECTION_RATE: rows.map((r) => percent(r.collectedCents, r.billedCents)),
    TRUST_BALANCE: rows.map((r) => r.trustBalanceCents),
    RENT_BILLED: rows.map((r) => r.billedCents),
    RENT_COLLECTED: rows.map((r) => r.collectedCents),
    NET_RENTAL_INCOME: rows.map((r) => r.collectedCents), // refined in Phase 2
  };
}

async function getExpiringLeases(
  ctx: RouteCtx,
  opts: { maxDays: number; minDays?: number; limit?: number } | number,
  legacyLimit = 5,
): Promise<ExpiringLeaseRow[]> {
  // Support both old (maxDays: number, limit) and new ({ maxDays, minDays, limit }) callers.
  const { minDays = 0, maxDays, limit = legacyLimit } =
    typeof opts === 'number' ? { maxDays: opts, minDays: 0, limit: legacyLimit } : opts;
  const propertyIds = await getPropertyIds(ctx);
  if (propertyIds.length === 0) return [];

  const now = Date.now();
  const rangeStart = new Date(now + minDays * 86400000);
  const rangeEnd = new Date(now + maxDays * 86400000);

  const rows = await db.lease.findMany({
    where: {
      orgId: ctx.orgId,
      state: { in: ['ACTIVE', 'RENEWED'] },
      endDate: { gte: rangeStart, lte: rangeEnd },
      unit: { propertyId: { in: propertyIds } },
    },
    orderBy: { endDate: 'asc' },
    include: {
      unit: { include: { property: { select: { name: true } } } },
      tenants: {
        where: { isPrimary: true },
        include: { tenant: { select: { firstName: true, lastName: true } } },
      },
    },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    propertyName: row.unit.property.name,
    unitLabel: row.unit.label,
    tenantName: row.tenants[0]?.tenant
      ? `${row.tenants[0].tenant.firstName} ${row.tenants[0].tenant.lastName}`
      : null,
    endDate: row.endDate,
    daysUntilExpiry: daysUntil(row.endDate),
    href: `/leases/${row.id}`,
  }));
}

async function getTopArrears(ctx: RouteCtx): Promise<ArrearsRow[]> {
  const propertyIds = await getPropertyIds(ctx);
  if (propertyIds.length === 0) return [];

  const rows = await db.invoice.findMany({
    where: {
      orgId: ctx.orgId,
      paidAt: null,
      status: { in: ['DUE', 'OVERDUE'] },
      dueDate: { lt: new Date() },
      lease: { unit: { propertyId: { in: propertyIds } } },
    },
    orderBy: [{ amountCents: 'desc' }, { dueDate: 'asc' }],
    include: {
      lease: {
        include: {
          unit: { include: { property: { select: { name: true } } } },
          tenants: {
            where: { isPrimary: true },
            include: { tenant: { select: { firstName: true, lastName: true } } },
          },
        },
      },
    },
    take: 5,
  });

  return rows.map((row) => ({
    id: row.id,
    title: `${row.lease.unit.property.name} / ${row.lease.unit.label}`,
    subtitle: row.lease.tenants[0]?.tenant
      ? `${row.lease.tenants[0].tenant.firstName} ${row.lease.tenants[0].tenant.lastName}`
      : 'Primary tenant missing',
    amountCents: row.totalCents > 0 ? row.totalCents : row.amountCents,
    href: `/leases/${row.leaseId}#invoices`,
  }));
}

async function getOpenMaintenance(ctx: RouteCtx, filters?: { status?: MaintenanceStatus }) {
  const propertyIds = await getPropertyIds(ctx);
  if (propertyIds.length === 0) return [];

  const rows = await db.maintenanceRequest.findMany({
    where: {
      orgId: ctx.orgId,
      status: filters?.status ?? { in: ['OPEN', 'IN_PROGRESS'] },
      unit: { propertyId: { in: propertyIds } },
    },
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
    include: {
      unit: { include: { property: { select: { name: true } } } },
      vendor: { select: { id: true, name: true } },
    },
    take: filters?.status ? 50 : 5,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: `${row.unit.property.name} / ${row.unit.label}`,
    status: row.status,
    priority: row.priority,
    scheduledFor: row.scheduledFor,
    href: `/maintenance/${row.id}`,
    vendorName: row.vendor?.name ?? null,
  }));
}

async function getBlockedApprovals(ctx: RouteCtx): Promise<ApprovalRow[]> {
  const propertyIds = await getPropertyIds(ctx);
  const properties = propertyIds.length
    ? await db.property.findMany({
        where: { id: { in: propertyIds } },
        select: { id: true, name: true },
      })
    : [];
  const propertyMap = new Map(properties.map((row) => [row.id, row.name]));
  const rows = await db.approval.findMany({
    where: {
      orgId: ctx.orgId,
      state: 'PENDING',
      ...(propertyIds.length > 0 ? { OR: [{ propertyId: null }, { propertyId: { in: propertyIds } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    propertyName: row.propertyId ? propertyMap.get(row.propertyId) ?? null : null,
    requestedAt: row.createdAt,
    href: '/dashboard/operations',
  }));
}

async function getUrgentMaintenanceCount(ctx: RouteCtx): Promise<number> {
  return db.maintenanceRequest.count({
    where: {
      orgId: ctx.orgId,
      priority: { in: ['HIGH', 'URGENT'] },
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    },
  });
}

async function computeNetRentalIncome(
  ctx: RouteCtx,
  periodStart: Date,
  collectedCents: number,
): Promise<number> {
  const agg = await db.landlordMonthlySnapshot.aggregate({
    where: { orgId: ctx.orgId, periodStart },
    _sum: { maintenanceSpendCents: true },
  });
  const maint = agg._sum.maintenanceSpendCents ?? 0;
  return collectedCents - maint;
}

export async function getStaffCommandCenter(
  ctx: RouteCtx,
  filters?: { periodStart?: Date; compare?: 'prior' | 'yoy' | 'off' },
): Promise<StaffCommandCenter> {
  const periodStart = monthFloor(filters?.periodStart ?? new Date());
  const priorPeriodStart = addMonths(periodStart, -1);
  let currentSnapshotRow = await db.orgMonthlySnapshot.findFirst({
    where: { orgId: ctx.orgId, periodStart },
  });
  if (!currentSnapshotRow || currentSnapshotRow.occupiedUnits > currentSnapshotRow.totalUnits) {
    try {
      currentSnapshotRow = await recomputeOrgSnapshot(ctx, periodStart);
    } catch (err) {
      console.error('[staff-analytics] lazy org snapshot hydrate failed', err);
    }
  }
  const [currentSnapshot, priorSnapshot, properties, expiringLeases, topArrears, openMaintenance, blockedApprovals, series] =
    await Promise.all([
      Promise.resolve(currentSnapshotRow),
      db.orgMonthlySnapshot.findFirst({ where: { orgId: ctx.orgId, periodStart: priorPeriodStart } }),
      getScopedProperties(ctx),
      getExpiringLeases(ctx, 30),
      getTopArrears(ctx),
      getOpenMaintenance(ctx),
      getBlockedApprovals(ctx),
      getOrgSnapshotSeries(ctx, periodStart, 24),
    ]);

  const seriesMap = new Map(series.map((row) => [keyForMonth(row.periodStart), row]));
  const rawTrend = Array.from({ length: 12 }, (_, index) => addMonths(periodStart, index - 11)).map((month) => {
    const row = seriesMap.get(keyForMonth(month));
    return {
      x: labelForMonth(month),
      y: row?.billedCents ?? 0,
      y2: row?.collectedCents ?? 0,
    };
  });
  // Trim leading all-zero months so the chart starts at the first month
  // with actual data (avoids a synthetic 0 → peak "spike" at the left edge).
  const firstNonZero = rawTrend.findIndex((p) => p.y > 0 || (p.y2 ?? 0) > 0);
  const collectionsTrend = firstNonZero > 0 ? rawTrend.slice(firstNonZero) : rawTrend;

  const sparkRows = Array.from({ length: 12 }, (_, index) => addMonths(periodStart, index - 11)).map((month) => {
    const row = seriesMap.get(keyForMonth(month));
    return {
      occupiedUnits: row?.occupiedUnits ?? 0,
      totalUnits: row?.totalUnits ?? 0,
      arrearsCents: row?.arrearsCents ?? 0,
      billedCents: row?.billedCents ?? 0,
      collectedCents: row?.collectedCents ?? 0,
      trustBalanceCents: row?.trustBalanceCents ?? 0,
    };
  });
  const kpiSparks = buildKpiSparks(sparkRows);

  const compareMode = filters?.compare ?? 'prior';
  const comboWindow = Array.from({ length: 12 }, (_, index) => addMonths(periodStart, index - 11));
  const collectionsCombo: ComboChartPoint[] = comboWindow.map((month) => {
    const row = seriesMap.get(keyForMonth(month));
    const priorMonth = addMonths(month, -12);
    const priorRow = compareMode === 'off' ? undefined : seriesMap.get(keyForMonth(priorMonth));
    return {
      x: labelForMonth(month),
      bars: row?.billedCents ?? 0,
      line: row?.collectedCents ?? 0,
      ...(priorRow ? { priorLine: priorRow.collectedCents } : {}),
    };
  });

  const statusCountsSource = await db.maintenanceRequest.findMany({
    where: { orgId: ctx.orgId, status: { in: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] } },
    select: { status: true },
  });
  const statusCounts = new Map<string, number>();
  for (const row of statusCountsSource) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }
  const maintenanceByStatus = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => ({
    x: status.replace('_', ' '),
    y: statusCounts.get(status) ?? 0,
  }));

  const [urgentCount, currentNet, priorNet] = await Promise.all([
    getUrgentMaintenanceCount(ctx),
    computeNetRentalIncome(ctx, periodStart, currentSnapshot?.collectedCents ?? 0),
    computeNetRentalIncome(ctx, priorPeriodStart, priorSnapshot?.collectedCents ?? 0),
  ]);

  return {
    periodStart,
    kpis: snapshotKpis(currentSnapshot ?? undefined, {
      netRentalIncome: currentNet,
      urgentMaintenance: urgentCount,
    }),
    priorKpis: snapshotKpis(priorSnapshot ?? undefined, {
      netRentalIncome: priorNet,
      urgentMaintenance: 0, // prior-period urgent count is not tracked yet; show as 0 → no delta
    }),
    kpiSparks,
    expiringLeases,
    topArrears,
    openMaintenance,
    blockedApprovals,
    portfolioPins: properties
      .map((row, index) => buildPropertyPin(row, index))
      .filter((pin): pin is PortfolioPin => pin !== null),
    collectionsTrend,
    collectionsCombo,
    maintenanceByStatus,
  };
}

export async function getStaffPortfolio(
  ctx: RouteCtx,
  filters?: { propertyId?: string },
): Promise<PortfolioView> {
  const periodStart = monthFloor(new Date());
  const properties = await getScopedProperties(ctx, filters?.propertyId);
  const propertyIds = properties.map((row) => row.id);
  let snapshots = await db.propertyMonthlySnapshot.findMany({
    where: {
      orgId: ctx.orgId,
      periodStart,
      ...(propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : {}),
    },
  });
  const stalePropertyIds = snapshots
    .filter((row) => row.occupiedUnits > row.totalUnits)
    .map((row) => row.propertyId);
  const missing = propertyIds.filter(
    (id) => !snapshots.some((row) => row.propertyId === id),
  );
  const toRecompute = [...new Set([...missing, ...stalePropertyIds])];
  if (toRecompute.length > 0) {
    await Promise.all(
      toRecompute.map((id) =>
        recomputePropertySnapshot(ctx, id, periodStart).catch((err) =>
          console.error('[staff-analytics] lazy property snapshot hydrate failed', { id, err }),
        ),
      ),
    );
    snapshots = await db.propertyMonthlySnapshot.findMany({
      where: {
        orgId: ctx.orgId,
        periodStart,
        ...(propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : {}),
      },
    });
  }
  const snapshotMap = new Map(snapshots.map((row) => [row.propertyId, row]));

  return {
    periodStart,
    rows: properties.map((property) => {
      const snapshot = snapshotMap.get(property.id);
      return {
        id: property.id,
        name: property.name,
        suburb: property.suburb,
        city: property.city,
        province: property.province,
        landlordName: property.landlord?.name ?? null,
        agentName: property.assignedAgent?.name ?? null,
        occupiedUnits: snapshot?.occupiedUnits ?? 0,
        totalUnits: snapshot?.totalUnits ?? 0,
        occupancyPct: percent(snapshot?.occupiedUnits ?? 0, snapshot?.totalUnits ?? 0),
        openMaintenance: snapshot?.openMaintenance ?? 0,
        arrearsCents: snapshot?.arrearsCents ?? 0,
        grossRentCents: snapshot?.grossRentCents ?? 0,
        href: `/properties/${property.id}`,
      };
    }),
    pins: properties
      .map((row, index) => buildPropertyPin(row, index))
      .filter((pin): pin is PortfolioPin => pin !== null),
  };
}

export async function getStaffFinance(
  ctx: RouteCtx,
  filters?: { periodStart?: Date },
): Promise<FinanceView> {
  const periodStart = monthFloor(filters?.periodStart ?? new Date());
  const priorPeriodStart = addMonths(periodStart, -1);
  let currentSnapshotRow = await db.orgMonthlySnapshot.findFirst({
    where: { orgId: ctx.orgId, periodStart },
  });
  if (!currentSnapshotRow || currentSnapshotRow.occupiedUnits > currentSnapshotRow.totalUnits) {
    try {
      currentSnapshotRow = await recomputeOrgSnapshot(ctx, periodStart);
    } catch (err) {
      console.error('[staff-analytics] lazy finance snapshot hydrate failed', err);
    }
  }
  const [currentSnapshot, priorSnapshot, series, trustAccounts, invoices] = await Promise.all([
    Promise.resolve(currentSnapshotRow),
    db.orgMonthlySnapshot.findFirst({ where: { orgId: ctx.orgId, periodStart: priorPeriodStart } }),
    getOrgSnapshotSeries(ctx, periodStart),
    db.trustAccount.findMany({
      where: { orgId: ctx.orgId },
      include: {
        landlord: { select: { name: true } },
        entries: true,
      },
    }),
    db.invoice.findMany({
      where: { orgId: ctx.orgId, paidAt: null, status: { in: ['DUE', 'OVERDUE'] } },
      select: { dueDate: true, totalCents: true, amountCents: true },
    }),
  ]);

  const seriesMap = new Map(series.map((row) => [keyForMonth(row.periodStart), row]));
  const rawTrend = Array.from({ length: 12 }, (_, index) => addMonths(periodStart, index - 11)).map((month) => {
    const row = seriesMap.get(keyForMonth(month));
    return {
      x: labelForMonth(month),
      y: row?.billedCents ?? 0,
      y2: row?.collectedCents ?? 0,
    };
  });
  const firstNonZero = rawTrend.findIndex((p) => p.y > 0 || (p.y2 ?? 0) > 0);
  const trend = firstNonZero > 0 ? rawTrend.slice(firstNonZero) : rawTrend;

  const buckets = [
    { x: 'Current', y: 0 },
    { x: '1-14', y: 0 },
    { x: '15-30', y: 0 },
    { x: '31+', y: 0 },
  ];
  for (const invoice of invoices) {
    const days = Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000);
    const cents = invoice.totalCents > 0 ? invoice.totalCents : invoice.amountCents;
    if (days <= 0) buckets[0].y += cents;
    else if (days <= 14) buckets[1].y += cents;
    else if (days <= 30) buckets[2].y += cents;
    else buckets[3].y += cents;
  }

  return {
    periodStart,
    kpis: snapshotKpis(currentSnapshot ?? undefined),
    priorKpis: snapshotKpis(priorSnapshot ?? undefined),
    trend,
    arrearsBuckets: buckets,
    trustBreakdown: trustAccounts.map((account) => ({
      id: account.id,
      label: account.landlord.name,
      y: account.entries.reduce((sum, entry) => sum + entry.amountCents, 0),
    })),
  };
}

export async function getStaffMaintenance(
  ctx: RouteCtx,
  filters?: { vendorId?: string; status?: MaintenanceStatus },
): Promise<MaintenanceView> {
  const propertyIds = await getPropertyIds(ctx);
  if (propertyIds.length === 0) {
    return {
      queue: [],
      statusCounts: [],
      vendorLeaderboard: [],
      averageCloseDays: 0,
    };
  }

  const rows = await db.maintenanceRequest.findMany({
    where: {
      orgId: ctx.orgId,
      unit: { propertyId: { in: propertyIds } },
      ...(filters?.vendorId ? { assignedVendorId: filters.vendorId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      unit: { include: { property: { select: { name: true } } } },
      vendor: { select: { id: true, name: true } },
    },
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
  });

  const statusMap = new Map<string, number>();
  const vendorMap = new Map<string, { id: string; label: string; value: number }>();
  let closedCount = 0;
  let closedDays = 0;

  for (const row of rows) {
    statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1);
    if (row.vendor) {
      const bucket = vendorMap.get(row.vendor.id) ?? { id: row.vendor.id, label: row.vendor.name, value: 0 };
      bucket.value += row.invoiceCents ?? row.quotedCostCents ?? row.estimatedCostCents ?? 0;
      vendorMap.set(row.vendor.id, bucket);
    }
    if (row.completedAt) {
      closedCount += 1;
      closedDays += Math.max(1, Math.round((row.completedAt.getTime() - row.createdAt.getTime()) / 86400000));
    }
  }

  return {
    queue: rows.slice(0, filters?.status ? 50 : 12).map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: `${row.unit.property.name} / ${row.unit.label}`,
      status: row.status,
      priority: row.priority,
      scheduledFor: row.scheduledFor,
      href: `/maintenance/${row.id}`,
    })),
    statusCounts: [...statusMap.entries()].map(([status, count]) => ({ x: status.replace('_', ' '), y: count })),
    vendorLeaderboard: [...vendorMap.values()].sort((a, b) => b.value - a.value).slice(0, 5),
    averageCloseDays: closedCount > 0 ? Math.round(closedDays / closedCount) : 0,
  };
}

export async function getStaffOperations(ctx: RouteCtx): Promise<OperationsView> {
  const propertyIds = await getPropertyIds(ctx);
  const [expiring30, expiring60, expiring90, blockedApprovals, activeLeases, moveInInspections] = await Promise.all([
    getExpiringLeases(ctx, { minDays: 0, maxDays: 30, limit: 20 }),
    getExpiringLeases(ctx, { minDays: 31, maxDays: 60, limit: 20 }),
    getExpiringLeases(ctx, { minDays: 61, maxDays: 90, limit: 20 }),
    getBlockedApprovals(ctx),
    db.lease.findMany({
      where: {
        orgId: ctx.orgId,
        state: { in: ['ACTIVE', 'RENEWED'] },
        ...(propertyIds.length > 0 ? { unit: { propertyId: { in: propertyIds } } } : {}),
      },
      include: {
        unit: { include: { property: { select: { name: true } } } },
      },
    }),
    db.inspection.findMany({
      where: { orgId: ctx.orgId, type: 'MOVE_IN' },
      select: { leaseId: true },
    }),
  ]);

  const inspectedLeaseIds = new Set(moveInInspections.map((row) => row.leaseId));
  const missingMoveIns = activeLeases
    .filter((lease) => !inspectedLeaseIds.has(lease.id))
    .slice(0, 10)
    .map((lease) => ({
      id: lease.id,
      label: `${lease.unit.property.name} / ${lease.unit.label}`,
      detail: `Lease started ${lease.startDate.toISOString().slice(0, 10)}`,
      href: `/leases/${lease.id}/move-in`,
    }));

  return {
    expiring30,
    expiring60,
    expiring90,
    blockedApprovals,
    missingMoveIns,
  };
}
