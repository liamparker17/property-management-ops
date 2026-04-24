import { Prisma } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';

export type SnapshotEventKind =
  | 'LEASE_STATE'
  | 'PAYMENT'
  | 'ALLOCATION'
  | 'LEDGER'
  | 'MAINTENANCE'
  | 'INSPECTION'
  | 'OFFBOARDING';

type SnapshotRefs = { propertyId?: string; landlordId?: string; agentId?: string };
type SnapshotEventHandler = (
  ctx: RouteCtx,
  kind: SnapshotEventKind,
  refs?: SnapshotRefs,
) => Promise<void>;

function monthRange(periodStart: Date) {
  const start = monthFloor(periodStart);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start, end };
}

function asDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function overdueWhere(now: Date): Prisma.InvoiceWhereInput {
  return {
    OR: [
      { status: 'OVERDUE' },
      {
        status: { in: ['DUE'] },
        dueDate: { lt: now },
        paidAt: null,
      },
    ],
  };
}

function reportSnapshotFailure(kind: SnapshotEventKind, err: unknown) {
  console.error(`[snapshots] failed to refresh ${kind}`, err);
}

export function monthFloor(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function sumInvoiceTotals(where: Prisma.InvoiceWhereInput) {
  const invoices = await db.invoice.findMany({
    where,
    select: { totalCents: true, subtotalCents: true, amountCents: true },
  });
  return invoices.reduce((sum, invoice) => {
    const total =
      invoice.totalCents > 0
        ? invoice.totalCents
        : invoice.subtotalCents > 0
          ? invoice.subtotalCents
          : invoice.amountCents;
    return sum + total;
  }, 0);
}

async function sumTrustBalance(where: Prisma.TrustLedgerEntryWhereInput) {
  const result = await db.trustLedgerEntry.aggregate({
    where,
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

async function sumUnallocated(where: Prisma.TrustLedgerEntryWhereInput) {
  const rows = await db.trustLedgerEntry.findMany({
    where: {
      ...where,
      type: { in: ['RECEIPT', 'ALLOCATION', 'REVERSAL'] },
    },
    select: { type: true, amountCents: true },
  });
  return rows.reduce((sum, row) => sum + row.amountCents, 0);
}

export async function recomputeOrgSnapshot(ctx: RouteCtx, periodStart: Date) {
  const { start, end } = monthRange(periodStart);
  const now = new Date();

  const [
    totalUnits,
    occupiedUnitRows,
    activeLeases,
    expiringLeases30,
    openMaintenance,
    blockedApprovals,
    billedCents,
    collectedCentsAgg,
    arrearsCents,
    trustBalanceCents,
    unallocatedCents,
  ] = await Promise.all([
    db.unit.count({
      where: { orgId: ctx.orgId, property: { deletedAt: null } },
    }),
    db.lease.findMany({
      where: {
        orgId: ctx.orgId,
        state: { in: ['ACTIVE', 'RENEWED'] },
        unit: { property: { deletedAt: null } },
      },
      select: { unitId: true },
      distinct: ['unitId'],
    }),
    db.lease.count({
      where: { orgId: ctx.orgId, state: { in: ['ACTIVE', 'RENEWED'] } },
    }),
    db.lease.count({
      where: {
        orgId: ctx.orgId,
        state: 'ACTIVE',
        endDate: { gte: asDateOnly(now), lt: new Date(now.getTime() + 30 * 86400000) },
      },
    }),
    db.maintenanceRequest.count({
      where: { orgId: ctx.orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    db.approval.count({
      where: { orgId: ctx.orgId, state: 'PENDING' },
    }),
    sumInvoiceTotals({
      orgId: ctx.orgId,
      periodStart: { gte: start, lt: end },
    }),
    db.paymentReceipt.aggregate({
      where: { orgId: ctx.orgId, receivedAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    sumInvoiceTotals({
      orgId: ctx.orgId,
      ...overdueWhere(now),
    }),
    sumTrustBalance({
      trustAccount: { orgId: ctx.orgId },
    }),
    sumUnallocated({
      trustAccount: { orgId: ctx.orgId },
    }),
  ]);

  const occupiedUnits = occupiedUnitRows.length;
  const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);

  return db.orgMonthlySnapshot.upsert({
    where: {
      orgId_periodStart: { orgId: ctx.orgId, periodStart: start },
    },
    create: {
      orgId: ctx.orgId,
      periodStart: start,
      occupiedUnits,
      totalUnits,
      vacantUnits,
      activeLeases,
      expiringLeases30,
      openMaintenance,
      blockedApprovals,
      billedCents,
      collectedCents: collectedCentsAgg._sum.amountCents ?? 0,
      arrearsCents,
      trustBalanceCents,
      unallocatedCents,
    },
    update: {
      occupiedUnits,
      totalUnits,
      vacantUnits,
      activeLeases,
      expiringLeases30,
      openMaintenance,
      blockedApprovals,
      billedCents,
      collectedCents: collectedCentsAgg._sum.amountCents ?? 0,
      arrearsCents,
      trustBalanceCents,
      unallocatedCents,
      refreshedAt: new Date(),
    },
  });
}

export async function recomputePropertySnapshot(ctx: RouteCtx, propertyId: string, periodStart: Date) {
  const { start, end } = monthRange(periodStart);
  const now = new Date();
  const property = await db.property.findFirst({
    where: { id: propertyId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!property) throw new Error(`Property ${propertyId} not found`);

  const [totalUnits, occupiedUnitRows, openMaintenance, arrearsCents, grossRentCents] = await Promise.all([
    db.unit.count({ where: { propertyId } }),
    db.lease.findMany({
      where: {
        orgId: ctx.orgId,
        state: { in: ['ACTIVE', 'RENEWED'] },
        unit: { propertyId },
      },
      select: { unitId: true },
      distinct: ['unitId'],
    }),
    db.maintenanceRequest.count({
      where: { orgId: ctx.orgId, unit: { propertyId }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    sumInvoiceTotals({
      orgId: ctx.orgId,
      lease: { unit: { propertyId } },
      ...overdueWhere(now),
    }),
    sumInvoiceTotals({
      orgId: ctx.orgId,
      periodStart: { gte: start, lt: end },
      lease: { unit: { propertyId } },
    }),
  ]);

  return db.propertyMonthlySnapshot.upsert({
    where: {
      propertyId_periodStart: { propertyId, periodStart: start },
    },
    create: {
      orgId: ctx.orgId,
      propertyId,
      periodStart: start,
      occupiedUnits: occupiedUnitRows.length,
      totalUnits,
      openMaintenance,
      arrearsCents,
      grossRentCents,
    },
    update: {
      occupiedUnits: occupiedUnitRows.length,
      totalUnits,
      openMaintenance,
      arrearsCents,
      grossRentCents,
      refreshedAt: new Date(),
    },
  });
}

async function computeVacancyDragForLandlord(orgId: string, landlordId: string) {
  const units = await db.unit.findMany({
    where: { property: { orgId, landlordId, deletedAt: null } },
    select: {
      id: true,
      leases: {
        orderBy: { endDate: 'desc' },
        take: 1,
        select: { rentAmountCents: true, state: true },
      },
    },
  });
  return units.reduce((sum, unit) => {
    const active = unit.leases[0];
    if (!active || active.state === 'ACTIVE' || active.state === 'RENEWED') return sum;
    return sum + active.rentAmountCents;
  }, 0);
}

export async function recomputeLandlordSnapshot(ctx: RouteCtx, landlordId: string, periodStart: Date) {
  const { start, end } = monthRange(periodStart);
  const landlord = await db.landlord.findFirst({
    where: { id: landlordId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!landlord) throw new Error(`Landlord ${landlordId} not found`);

  const [grossRentCents, collectedCentsAgg, disbursedRaw, maintenanceSpendRaw, vacancyDragCents, trustBalanceCents] =
    await Promise.all([
      sumInvoiceTotals({
        orgId: ctx.orgId,
        periodStart: { gte: start, lt: end },
        lease: { unit: { property: { landlordId } } },
      }),
      db.paymentReceipt.aggregate({
        where: {
          orgId: ctx.orgId,
          receivedAt: { gte: start, lt: end },
          lease: { unit: { property: { landlordId } } },
        },
        _sum: { amountCents: true },
      }),
      db.trustLedgerEntry.aggregate({
        where: {
          landlordId,
          occurredAt: { gte: start, lt: end },
          type: 'DISBURSEMENT',
        },
        _sum: { amountCents: true },
      }),
      db.trustLedgerEntry.aggregate({
        where: {
          landlordId,
          occurredAt: { gte: start, lt: end },
          type: 'FEE',
        },
        _sum: { amountCents: true },
      }),
      computeVacancyDragForLandlord(ctx.orgId, landlordId),
      sumTrustBalance({ landlordId, trustAccount: { orgId: ctx.orgId } }),
    ]);

  return db.landlordMonthlySnapshot.upsert({
    where: {
      landlordId_periodStart: { landlordId, periodStart: start },
    },
    create: {
      orgId: ctx.orgId,
      landlordId,
      periodStart: start,
      grossRentCents,
      collectedCents: collectedCentsAgg._sum.amountCents ?? 0,
      disbursedCents: Math.abs(disbursedRaw._sum.amountCents ?? 0),
      maintenanceSpendCents: Math.abs(maintenanceSpendRaw._sum.amountCents ?? 0),
      vacancyDragCents,
      trustBalanceCents,
    },
    update: {
      grossRentCents,
      collectedCents: collectedCentsAgg._sum.amountCents ?? 0,
      disbursedCents: Math.abs(disbursedRaw._sum.amountCents ?? 0),
      maintenanceSpendCents: Math.abs(maintenanceSpendRaw._sum.amountCents ?? 0),
      vacancyDragCents,
      trustBalanceCents,
      refreshedAt: new Date(),
    },
  });
}

export async function recomputeAgentSnapshot(ctx: RouteCtx, agentId: string, periodStart: Date) {
  const start = monthFloor(periodStart);
  const now = new Date();
  const agent = await db.managingAgent.findFirst({
    where: { id: agentId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  const propertyIds = await db.property.findMany({
    where: { orgId: ctx.orgId, assignedAgentId: agentId, deletedAt: null },
    select: { id: true },
  });
  const scopedPropertyIds = propertyIds.map((row) => row.id);

  const [openTickets, blockedApprovals, upcomingInspections] = await Promise.all([
    db.maintenanceRequest.count({
      where: {
        orgId: ctx.orgId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        unit: { property: { assignedAgentId: agentId } },
      },
    }),
    db.approval.count({
      where: {
        orgId: ctx.orgId,
        state: 'PENDING',
        ...(scopedPropertyIds.length > 0 ? { propertyId: { in: scopedPropertyIds } } : { propertyId: '__none__' }),
      },
    }),
    db.inspection.count({
      where: {
        orgId: ctx.orgId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledAt: { gte: now },
        unit: { property: { assignedAgentId: agentId } },
      },
    }),
  ]);

  return db.agentMonthlySnapshot.upsert({
    where: {
      agentId_periodStart: { agentId, periodStart: start },
    },
    create: {
      orgId: ctx.orgId,
      agentId,
      periodStart: start,
      openTickets,
      blockedApprovals,
      upcomingInspections,
    },
    update: {
      openTickets,
      blockedApprovals,
      upcomingInspections,
      refreshedAt: new Date(),
    },
  });
}

const liveSnapshotEventHandler: SnapshotEventHandler = async (
  ctx: RouteCtx,
  kind: SnapshotEventKind,
  refs?: SnapshotRefs,
) => {
  await Promise.resolve()
    .then(async () => {
      const periodStart = monthFloor(new Date());
      const tasks: Promise<unknown>[] = [recomputeOrgSnapshot(ctx, periodStart)];

      if (kind === 'LEASE_STATE' || kind === 'MAINTENANCE' || kind === 'INSPECTION' || kind === 'OFFBOARDING') {
        if (refs?.propertyId) tasks.push(recomputePropertySnapshot(ctx, refs.propertyId, periodStart));
      }

      if (kind === 'LEASE_STATE' || kind === 'PAYMENT' || kind === 'ALLOCATION' || kind === 'LEDGER' || kind === 'OFFBOARDING') {
        if (refs?.landlordId) tasks.push(recomputeLandlordSnapshot(ctx, refs.landlordId, periodStart));
      }

      if (kind === 'LEASE_STATE' || kind === 'MAINTENANCE' || kind === 'INSPECTION') {
        if (refs?.agentId) tasks.push(recomputeAgentSnapshot(ctx, refs.agentId, periodStart));
      }

      await Promise.all(tasks);
    })
    .catch((err) => {
      reportSnapshotFailure(kind, err);
    });
};

let snapshotEventHandler: SnapshotEventHandler = liveSnapshotEventHandler;

export function __setSnapshotEventHandlerForTests(handler: SnapshotEventHandler | null) {
  snapshotEventHandler = handler ?? liveSnapshotEventHandler;
}

export function recordSnapshotEvent(
  ctx: RouteCtx,
  kind: SnapshotEventKind,
  refs?: SnapshotRefs,
): Promise<void> {
  return snapshotEventHandler(ctx, kind, refs);
}
