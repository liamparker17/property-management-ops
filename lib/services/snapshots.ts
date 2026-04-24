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

async function sumTrustBalance(scope: { orgId: string; landlordId?: string }) {
  // Trust account under EAAB/PPRA rules holds **security deposits only**.
  // Rent flows tenant → landlord directly; only deposits live in trust.
  // Authoritative source is the Lease record: active/renewed leases whose
  // deposit has been received. TrustLedgerEntry remains the audit log for
  // compliance but no longer drives the displayed balance. ACTIVE/RENEWED
  // is a sufficient proxy for "not yet settled" — settlement happens at
  // termination via OffboardingCase → DepositSettlement.
  const result = await db.lease.aggregate({
    where: {
      orgId: scope.orgId,
      state: { in: ['ACTIVE', 'RENEWED'] },
      depositReceivedAt: { not: null },
      ...(scope.landlordId
        ? { unit: { property: { landlordId: scope.landlordId } } }
        : {}),
    },
    _sum: { depositAmountCents: true },
  });
  return result._sum.depositAmountCents ?? 0;
}

async function sumUnallocated(orgId: string) {
  // Unapplied cash = sum of receipt allocations explicitly marked UNAPPLIED
  // (live, non-reversed). Summing every RECEIPT ledger row would double-count
  // every collected rand — that was the bug.
  const result = await db.allocation.aggregate({
    where: {
      target: 'UNAPPLIED',
      reversedAt: null,
      receipt: { orgId },
    },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}

export async function recomputeOrgSnapshot(ctx: RouteCtx, periodStart: Date) {
  const { start, end } = monthRange(periodStart);
  const now = new Date();

  // Serial queries — Neon free-tier compute rejects high-fanout parallel
  // queries on cold start; Vercel serverless hits the same limit. Sequential
  // is slower per-call but finishes reliably without connection refusals.
  const totalUnits = await db.unit.count({
    where: { orgId: ctx.orgId, property: { deletedAt: null } },
  });
  const occupiedUnits = await db.unit.count({
    where: {
      orgId: ctx.orgId,
      property: { deletedAt: null },
      leases: { some: { state: { in: ['ACTIVE', 'RENEWED'] } } },
    },
  });
  const activeLeases = await db.lease.count({
    where: { orgId: ctx.orgId, state: { in: ['ACTIVE', 'RENEWED'] } },
  });
  const expiringLeases30 = await db.lease.count({
    where: {
      orgId: ctx.orgId,
      state: 'ACTIVE',
      endDate: { gte: asDateOnly(now), lt: new Date(now.getTime() + 30 * 86400000) },
    },
  });
  const openMaintenance = await db.maintenanceRequest.count({
    where: { orgId: ctx.orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
  });
  const blockedApprovals = await db.approval.count({
    where: { orgId: ctx.orgId, state: 'PENDING' },
  });
  const billedCents = await sumInvoiceTotals({
    orgId: ctx.orgId,
    periodStart: { gte: start, lt: end },
  });
  const collectedCentsAgg = await db.paymentReceipt.aggregate({
    where: { orgId: ctx.orgId, receivedAt: { gte: start, lt: end } },
    _sum: { amountCents: true },
  });
  const arrearsCents = await sumInvoiceTotals({
    orgId: ctx.orgId,
    ...overdueWhere(now),
  });
  const trustBalanceCents = await sumTrustBalance({ orgId: ctx.orgId });
  const unallocatedCents = await sumUnallocated(ctx.orgId);

  const safeOccupied = Math.min(occupiedUnits, totalUnits);
  const vacantUnits = Math.max(totalUnits - safeOccupied, 0);

  return db.orgMonthlySnapshot.upsert({
    where: {
      orgId_periodStart: { orgId: ctx.orgId, periodStart: start },
    },
    create: {
      orgId: ctx.orgId,
      periodStart: start,
      occupiedUnits: safeOccupied,
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
      occupiedUnits: safeOccupied,
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
  if (!property) {
    // Stale session referring to a property in a different/wiped org.
    // Skip silently — dashboards just render without this snapshot.
    return null;
  }

  // Serialized to avoid Neon cold-start connection refusals.
  const totalUnits = await db.unit.count({
    where: { propertyId, orgId: ctx.orgId },
  });
  const occupiedUnits = await db.unit.count({
    where: {
      propertyId,
      orgId: ctx.orgId,
      leases: { some: { orgId: ctx.orgId, state: { in: ['ACTIVE', 'RENEWED'] } } },
    },
  });
  const openMaintenance = await db.maintenanceRequest.count({
    where: { orgId: ctx.orgId, unit: { propertyId }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
  });
  const arrearsCents = await sumInvoiceTotals({
    orgId: ctx.orgId,
    lease: { unit: { propertyId } },
    ...overdueWhere(now),
  });
  const grossRentCents = await sumInvoiceTotals({
    orgId: ctx.orgId,
    periodStart: { gte: start, lt: end },
    lease: { unit: { propertyId } },
  });

  return db.propertyMonthlySnapshot.upsert({
    where: {
      propertyId_periodStart: { propertyId, periodStart: start },
    },
    create: {
      orgId: ctx.orgId,
      propertyId,
      periodStart: start,
      occupiedUnits: Math.min(occupiedUnits, totalUnits),
      totalUnits,
      openMaintenance,
      arrearsCents,
      grossRentCents,
    },
    update: {
      occupiedUnits: Math.min(occupiedUnits, totalUnits),
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
  if (!landlord) return null;

  const grossRentCents = await sumInvoiceTotals({
    orgId: ctx.orgId,
    periodStart: { gte: start, lt: end },
    lease: { unit: { property: { landlordId } } },
  });
  const collectedCentsAgg = await db.paymentReceipt.aggregate({
    where: {
      orgId: ctx.orgId,
      receivedAt: { gte: start, lt: end },
      lease: { unit: { property: { landlordId } } },
    },
    _sum: { amountCents: true },
  });
  const disbursedRaw = await db.trustLedgerEntry.aggregate({
    where: {
      landlordId,
      occurredAt: { gte: start, lt: end },
      type: 'DISBURSEMENT',
    },
    _sum: { amountCents: true },
  });
  const maintenanceSpendRaw = await db.trustLedgerEntry.aggregate({
    where: {
      landlordId,
      occurredAt: { gte: start, lt: end },
      type: 'FEE',
    },
    _sum: { amountCents: true },
  });
  const vacancyDragCents = await computeVacancyDragForLandlord(ctx.orgId, landlordId);
  const trustBalanceCents = await sumTrustBalance({ orgId: ctx.orgId, landlordId });

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
  if (!agent) return null;

  const propertyIds = await db.property.findMany({
    where: { orgId: ctx.orgId, assignedAgentId: agentId, deletedAt: null },
    select: { id: true },
  });
  const scopedPropertyIds = propertyIds.map((row) => row.id);

  const openTickets = await db.maintenanceRequest.count({
    where: {
      orgId: ctx.orgId,
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      unit: { property: { assignedAgentId: agentId } },
    },
  });
  const blockedApprovals = await db.approval.count({
    where: {
      orgId: ctx.orgId,
      state: 'PENDING',
      ...(scopedPropertyIds.length > 0 ? { propertyId: { in: scopedPropertyIds } } : { propertyId: '__none__' }),
    },
  });
  const upcomingInspections = await db.inspection.count({
    where: {
      orgId: ctx.orgId,
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledAt: { gte: now },
      unit: { property: { assignedAgentId: agentId } },
    },
  });

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
