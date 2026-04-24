import type { ChartPoint } from '@/components/analytics/charts/area-chart';
import type { PortfolioPin } from '@/components/analytics/maps/portfolio-pins';
import type { KpiId } from '@/lib/analytics/kpis';
import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { withRoleScopeFilter } from '@/lib/services/role-scope';
import { monthFloor, recomputeLandlordSnapshot, recomputePropertySnapshot } from '@/lib/services/snapshots';

type LandlordKpiMap = Record<
  Extract<KpiId, 'GROSS_RENT' | 'COLLECTION_RATE' | 'DISBURSED_CENTS' | 'MAINTENANCE_SPEND' | 'VACANCY_DRAG' | 'TRUST_BALANCE' | 'OPEN_MAINTENANCE'>,
  number
>;

export type LandlordOverview = {
  periodStart: Date;
  kpis: LandlordKpiMap;
  priorKpis: Partial<LandlordKpiMap>;
  cashflow: ChartPoint[];
  upcomingDisbursementCents: number;
  openMaintenance: number;
};

export type LandlordPortfolioRow = {
  id: string;
  name: string;
  suburb: string;
  city: string;
  occupiedUnits: number;
  totalUnits: number;
  openMaintenance: number;
  arrearsCents: number;
  grossRentCents: number;
  href: string;
};

export type LandlordMaintenanceExposure = {
  openTickets: number;
  averageCostYtd: number;
  vendorLeaderboard: { id: string; label: string; value: number }[];
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

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)));
}

function requireLandlordId(ctx: RouteCtx) {
  if (!ctx.user?.landlordId) {
    throw new Error('Landlord analytics require ctx.user.landlordId');
  }
  return ctx.user.landlordId;
}

async function getScopedProperties(ctx: RouteCtx) {
  return db.property.findMany({
    where: withRoleScopeFilter(ctx, { deletedAt: null }),
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      suburb: true,
      city: true,
    },
  });
}

function buildPins(properties: Awaited<ReturnType<typeof getScopedProperties>>): PortfolioPin[] {
  return properties.map((property, index) => ({
    id: property.id,
    label: property.name,
    lat: -26.2041 + index * 0.01,
    lng: 28.0473 + index * 0.01,
    href: `/landlord/properties/${property.id}`,
    meta: `${property.suburb}, ${property.city}`,
  }));
}

function snapshotToKpis(snapshot?: {
  grossRentCents: number;
  collectedCents: number;
  disbursedCents: number;
  maintenanceSpendCents: number;
  vacancyDragCents: number;
  trustBalanceCents: number;
}) {
  return {
    GROSS_RENT: snapshot?.grossRentCents ?? 0,
    COLLECTION_RATE: percent(snapshot?.collectedCents ?? 0, snapshot?.grossRentCents ?? 0),
    DISBURSED_CENTS: snapshot?.disbursedCents ?? 0,
    MAINTENANCE_SPEND: snapshot?.maintenanceSpendCents ?? 0,
    VACANCY_DRAG: snapshot?.vacancyDragCents ?? 0,
    TRUST_BALANCE: snapshot?.trustBalanceCents ?? 0,
    OPEN_MAINTENANCE: 0,
  } satisfies LandlordKpiMap;
}

export async function getLandlordOverview(ctx: RouteCtx): Promise<LandlordOverview> {
  const landlordId = requireLandlordId(ctx);
  const periodStart = monthFloor(new Date());
  const priorPeriodStart = addMonths(periodStart, -1);
  let currentSnapshotRow = await db.landlordMonthlySnapshot.findFirst({
    where: { orgId: ctx.orgId, landlordId, periodStart },
  });
  if (!currentSnapshotRow) {
    try {
      currentSnapshotRow = await recomputeLandlordSnapshot(ctx, landlordId, periodStart);
    } catch (err) {
      console.error('[landlord-analytics] lazy hydrate failed', err);
    }
  }
  const [currentSnapshot, priorSnapshot, snapshots, openMaintenance] = await Promise.all([
    Promise.resolve(currentSnapshotRow),
    db.landlordMonthlySnapshot.findFirst({ where: { orgId: ctx.orgId, landlordId, periodStart: priorPeriodStart } }),
    db.landlordMonthlySnapshot.findMany({
      where: {
        orgId: ctx.orgId,
        landlordId,
        periodStart: { gte: addMonths(periodStart, -11), lte: periodStart },
      },
      orderBy: { periodStart: 'asc' },
    }),
    db.maintenanceRequest.count({
      where: {
        orgId: ctx.orgId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        unit: { property: withRoleScopeFilter(ctx, { deletedAt: null }) },
      },
    }),
  ]);

  const seriesMap = new Map(snapshots.map((row) => [keyForMonth(row.periodStart), row]));
  const cashflow = Array.from({ length: 12 }, (_, index) => addMonths(periodStart, index - 11)).map((month) => {
    const row = seriesMap.get(keyForMonth(month));
    return {
      x: labelForMonth(month),
      y: row?.collectedCents ?? 0,
      y2: row?.disbursedCents ?? 0,
    };
  });

  return {
    periodStart,
    kpis: { ...snapshotToKpis(currentSnapshot ?? undefined), OPEN_MAINTENANCE: openMaintenance },
    priorKpis: snapshotToKpis(priorSnapshot ?? undefined),
    cashflow,
    upcomingDisbursementCents: currentSnapshot?.trustBalanceCents ?? 0,
    openMaintenance,
  };
}

export async function getLandlordCashflow(ctx: RouteCtx) {
  return getLandlordOverview(ctx);
}

export async function getLandlordPortfolio(ctx: RouteCtx): Promise<{ rows: LandlordPortfolioRow[]; pins: PortfolioPin[] }> {
  const periodStart = monthFloor(new Date());
  const properties = await getScopedProperties(ctx);
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
  const missing = propertyIds.filter((id) => !snapshots.some((row) => row.propertyId === id));
  const toRecompute = [...new Set([...missing, ...stalePropertyIds])];
  if (toRecompute.length > 0) {
    await Promise.all(
      toRecompute.map((id) =>
        recomputePropertySnapshot(ctx, id, periodStart).catch((err) =>
          console.error('[landlord-analytics] lazy property snapshot hydrate failed', { id, err }),
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
    rows: properties.map((property) => {
      const snapshot = snapshotMap.get(property.id);
      return {
        id: property.id,
        name: property.name,
        suburb: property.suburb,
        city: property.city,
        occupiedUnits: snapshot?.occupiedUnits ?? 0,
        totalUnits: snapshot?.totalUnits ?? 0,
        openMaintenance: snapshot?.openMaintenance ?? 0,
        arrearsCents: snapshot?.arrearsCents ?? 0,
        grossRentCents: snapshot?.grossRentCents ?? 0,
        href: `/landlord/properties/${property.id}`,
      };
    }),
    pins: buildPins(properties),
  };
}

export async function getLandlordYield(ctx: RouteCtx) {
  const portfolio = await getLandlordPortfolio(ctx);
  return portfolio.rows.map((row) => ({
    propertyId: row.id,
    propertyName: row.name,
    annualisedCollectedCents: row.grossRentCents * 12,
    valuationCents: null,
    valuationMissing: true,
    yieldPct: null as number | null,
  }));
}

export async function getLandlordMaintenanceExposure(ctx: RouteCtx): Promise<LandlordMaintenanceExposure> {
  const rows = await db.maintenanceRequest.findMany({
    where: {
      orgId: ctx.orgId,
      unit: { property: withRoleScopeFilter(ctx, { deletedAt: null }) },
    },
    include: {
      vendor: { select: { id: true, name: true } },
    },
  });

  let openTickets = 0;
  let costCount = 0;
  let costTotal = 0;
  const vendorMap = new Map<string, { id: string; label: string; value: number }>();

  for (const row of rows) {
    if (row.status === 'OPEN' || row.status === 'IN_PROGRESS') openTickets += 1;
    const amount = row.invoiceCents ?? row.quotedCostCents ?? row.estimatedCostCents ?? 0;
    if (amount > 0) {
      costCount += 1;
      costTotal += amount;
    }
    if (row.vendor) {
      const bucket = vendorMap.get(row.vendor.id) ?? { id: row.vendor.id, label: row.vendor.name, value: 0 };
      bucket.value += amount;
      vendorMap.set(row.vendor.id, bucket);
    }
  }

  return {
    openTickets,
    averageCostYtd: costCount > 0 ? Math.round(costTotal / costCount) : 0,
    vendorLeaderboard: [...vendorMap.values()].sort((a, b) => b.value - a.value).slice(0, 5),
  };
}
