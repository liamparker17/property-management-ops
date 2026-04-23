import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { Lease, LeaseState, Prisma } from '@prisma/client';
import type { z } from 'zod';
import type {
  createLeaseSchema,
  updateDraftLeaseSchema,
  terminateLeaseSchema,
  leaseListQuerySchema,
} from '@/lib/zod/lease';
import { writeLedgerEntry } from '@/lib/services/trust';
import { writeAudit } from '@/lib/services/audit';

export type DerivedStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function deriveStatus(
  lease: Pick<Lease, 'state' | 'endDate'>,
  expiringWindowDays: number,
  now: Date = new Date(),
): DerivedStatus {
  switch (lease.state) {
    case 'DRAFT': return 'DRAFT';
    case 'TERMINATED': return 'TERMINATED';
    case 'RENEWED': return 'RENEWED';
    case 'ACTIVE': {
      const today = toDateOnly(now);
      const end = toDateOnly(lease.endDate);
      if (end < today) return 'EXPIRED';
      const windowEnd = new Date(today);
      windowEnd.setUTCDate(windowEnd.getUTCDate() + expiringWindowDays);
      if (end <= windowEnd) return 'EXPIRING';
      return 'ACTIVE';
    }
  }
}

async function getExpiringWindow(orgId: string): Promise<number> {
  const org = await db.org.findUnique({ where: { id: orgId }, select: { expiringWindowDays: true } });
  return org?.expiringWindowDays ?? Number(process.env.EXPIRING_WINDOW_DAYS ?? 60);
}

async function assertNoOverlap(
  tx: Prisma.TransactionClient,
  orgId: string,
  unitId: string,
  startDate: Date,
  endDate: Date,
  excludeLeaseId?: string,
) {
  const conflicts = await tx.lease.findMany({
    where: {
      orgId,
      unitId,
      state: 'ACTIVE',
      ...(excludeLeaseId ? { NOT: { id: excludeLeaseId } } : {}),
      AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }],
    },
    select: { id: true, startDate: true, endDate: true },
  });
  if (conflicts.length > 0) {
    throw ApiError.conflict('Lease period overlaps an existing active lease', {
      conflictingLeaseIds: conflicts.map((c) => c.id),
      code: 'LEASE_OVERLAP',
    });
  }
}

export async function listLeases(ctx: RouteCtx, query: z.infer<typeof leaseListQuerySchema>) {
  const window = await getExpiringWindow(ctx.orgId);
  const now = new Date();
  const today = toDateOnly(now);

  const where: Prisma.LeaseWhereInput = { orgId: ctx.orgId };
  if (query.unitId) where.unitId = query.unitId;
  if (query.propertyId) where.unit = { propertyId: query.propertyId };

  if (query.status) {
    switch (query.status) {
      case 'DRAFT':
      case 'TERMINATED':
      case 'RENEWED':
        where.state = query.status as LeaseState;
        break;
      case 'ACTIVE': {
        const cutoff = new Date(today);
        cutoff.setUTCDate(cutoff.getUTCDate() + window);
        where.state = 'ACTIVE';
        where.endDate = { gt: cutoff };
        break;
      }
      case 'EXPIRING': {
        const cutoff = new Date(today);
        cutoff.setUTCDate(cutoff.getUTCDate() + window);
        where.state = 'ACTIVE';
        where.endDate = { gte: today, lte: cutoff };
        break;
      }
      case 'EXPIRED': {
        where.state = 'ACTIVE';
        where.endDate = { lt: today };
        break;
      }
    }
  }

  if (query.expiringWithinDays !== undefined) {
    const cutoff = new Date(today);
    cutoff.setUTCDate(cutoff.getUTCDate() + query.expiringWithinDays);
    where.state = 'ACTIVE';
    where.endDate = { gte: today, lte: cutoff };
  }

  const leases = await db.lease.findMany({
    where,
    orderBy: { startDate: 'desc' },
    include: {
      unit: { include: { property: { select: { id: true, name: true } } } },
      tenants: { include: { tenant: true } },
    },
  });

  return leases.map((l) => ({ ...l, status: deriveStatus(l, window, now) }));
}

export async function getLease(ctx: RouteCtx, id: string) {
  const lease = await db.lease.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      unit: { include: { property: true } },
      tenants: { include: { tenant: true } },
      documents: true,
      renewedFrom: true,
      renewedTo: true,
    },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  const window = await getExpiringWindow(ctx.orgId);
  return { ...lease, status: deriveStatus(lease, window) };
}

export async function createLease(ctx: RouteCtx, input: z.infer<typeof createLeaseSchema>) {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  return db.$transaction(async (tx) => {
    const unit = await tx.unit.findFirst({
      where: { id: input.unitId, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!unit) throw ApiError.notFound('Unit not found');

    const tenants = await tx.tenant.findMany({
      where: { id: { in: input.tenantIds }, orgId: ctx.orgId, archivedAt: null },
      select: { id: true },
    });
    if (tenants.length !== input.tenantIds.length) {
      throw ApiError.validation({ tenantIds: 'One or more tenants not found or archived' });
    }

    return tx.lease.create({
      data: {
        orgId: ctx.orgId,
        unitId: input.unitId,
        startDate: start,
        endDate: end,
        rentAmountCents: input.rentAmountCents,
        depositAmountCents: input.depositAmountCents,
        heldInTrustAccount: input.heldInTrustAccount,
        paymentDueDay: input.paymentDueDay,
        notes: input.notes ?? null,
        state: 'DRAFT',
        tenants: {
          create: input.tenantIds.map((tid) => ({
            tenantId: tid,
            isPrimary: tid === input.primaryTenantId,
          })),
        },
      },
      include: { tenants: { include: { tenant: true } } },
    });
  });
}

export async function updateDraftLease(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateDraftLeaseSchema>,
) {
  return db.$transaction(async (tx) => {
    const existing = await tx.lease.findFirst({ where: { id, orgId: ctx.orgId } });
    if (!existing) throw ApiError.notFound('Lease not found');
    if (existing.state !== 'DRAFT') throw ApiError.conflict('Only DRAFT leases may be edited');

    const data: Prisma.LeaseUpdateInput = {};
    if (input.startDate) data.startDate = parseDate(input.startDate);
    if (input.endDate) data.endDate = parseDate(input.endDate);
    if (input.rentAmountCents !== undefined) data.rentAmountCents = input.rentAmountCents;
    if (input.depositAmountCents !== undefined) data.depositAmountCents = input.depositAmountCents;
    if (input.heldInTrustAccount !== undefined) data.heldInTrustAccount = input.heldInTrustAccount;
    if (input.paymentDueDay !== undefined) data.paymentDueDay = input.paymentDueDay;
    if (input.notes !== undefined) data.notes = input.notes;

    await tx.lease.update({ where: { id }, data });

    if (input.tenantIds && input.primaryTenantId) {
      if (!input.tenantIds.includes(input.primaryTenantId)) {
        throw ApiError.validation({ primaryTenantId: 'Must be included in tenantIds' });
      }
      await tx.leaseTenant.deleteMany({ where: { leaseId: id } });
      await tx.leaseTenant.createMany({
        data: input.tenantIds.map((tid) => ({
          leaseId: id,
          tenantId: tid,
          isPrimary: tid === input.primaryTenantId,
        })),
      });
    }

    return tx.lease.findUniqueOrThrow({
      where: { id },
      include: { tenants: { include: { tenant: true } } },
    });
  });
}

export async function activateLease(ctx: RouteCtx, id: string) {
  return db.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        tenants: true,
        unit: { include: { property: { select: { landlordId: true } } } },
      },
    });
    if (!lease) throw ApiError.notFound('Lease not found');
    if (lease.state !== 'DRAFT') throw ApiError.conflict(`Lease is ${lease.state}, cannot activate`);
    if (lease.tenants.length === 0) throw ApiError.conflict('Cannot activate a lease with no tenants');
    const primaryCount = lease.tenants.filter((t) => t.isPrimary).length;
    if (primaryCount !== 1) {
      throw ApiError.conflict('Lease must have exactly one primary tenant to activate');
    }
    await assertNoOverlap(tx, ctx.orgId, lease.unitId, lease.startDate, lease.endDate, lease.id);
    const updated = await tx.lease.update({ where: { id }, data: { state: 'ACTIVE' } });

    if (lease.depositReceivedAt && lease.depositAmountCents > 0) {
      const landlordId = lease.unit.property.landlordId;
      if (!landlordId) {
        await writeAudit(ctx, {
          entityType: 'Lease',
          entityId: lease.id,
          action: 'activateLease.depositSkipped',
          payload: { reason: 'Property has no landlord' },
        });
      } else {
        const primary = lease.tenants.find((t) => t.isPrimary);
        await writeLedgerEntry(
          ctx,
          {
            landlordId,
            occurredAt: lease.depositReceivedAt,
            type: 'DEPOSIT_IN',
            amountCents: lease.depositAmountCents,
            tenantId: primary?.tenantId ?? null,
            leaseId: lease.id,
            sourceType: 'Lease',
            sourceId: lease.id,
            note: 'Deposit received on activation',
          },
          tx,
        );
      }
    }

    return updated;
  });
}

export async function terminateLease(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof terminateLeaseSchema>,
) {
  const lease = await db.lease.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!lease) throw ApiError.notFound('Lease not found');
  if (lease.state !== 'ACTIVE') {
    throw ApiError.conflict(`Only ACTIVE leases may be terminated (current: ${lease.state})`);
  }
  return db.lease.update({
    where: { id },
    data: {
      state: 'TERMINATED',
      terminatedAt: parseDate(input.terminatedAt),
      terminatedReason: input.terminatedReason,
    },
  });
}

export async function renewLease(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof createLeaseSchema>,
) {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  return db.$transaction(async (tx) => {
    const predecessor = await tx.lease.findFirst({
      where: { id, orgId: ctx.orgId },
      include: { tenants: true },
    });
    if (!predecessor) throw ApiError.notFound('Lease not found');
    if (predecessor.state !== 'ACTIVE') throw ApiError.conflict('Only ACTIVE leases can be renewed');
    if (predecessor.unitId !== input.unitId) {
      throw ApiError.validation({ unitId: 'Renewal must stay on the same unit' });
    }

    const tenants = await tx.tenant.findMany({
      where: { id: { in: input.tenantIds }, orgId: ctx.orgId, archivedAt: null },
      select: { id: true },
    });
    if (tenants.length !== input.tenantIds.length) {
      throw ApiError.validation({ tenantIds: 'One or more tenants not found or archived' });
    }

    const successor = await tx.lease.create({
      data: {
        orgId: ctx.orgId,
        unitId: input.unitId,
        startDate: start,
        endDate: end,
        rentAmountCents: input.rentAmountCents,
        depositAmountCents: input.depositAmountCents,
        heldInTrustAccount: input.heldInTrustAccount,
        paymentDueDay: input.paymentDueDay,
        notes: input.notes ?? null,
        state: 'DRAFT',
        renewedFromId: predecessor.id,
        tenants: {
          create: input.tenantIds.map((tid) => ({
            tenantId: tid,
            isPrimary: tid === input.primaryTenantId,
          })),
        },
      },
      include: { tenants: { include: { tenant: true } } },
    });

    await tx.lease.update({ where: { id: predecessor.id }, data: { state: 'RENEWED' } });
    return successor;
  });
}

export async function setPrimaryTenant(ctx: RouteCtx, leaseId: string, tenantId: string) {
  return db.$transaction(async (tx) => {
    const lease = await tx.lease.findFirst({
      where: { id: leaseId, orgId: ctx.orgId },
      include: { tenants: true },
    });
    if (!lease) throw ApiError.notFound('Lease not found');
    if (!lease.tenants.some((t) => t.tenantId === tenantId)) {
      throw ApiError.validation({ tenantId: 'Tenant is not on this lease' });
    }
    await tx.leaseTenant.updateMany({ where: { leaseId, isPrimary: true }, data: { isPrimary: false } });
    await tx.leaseTenant.update({
      where: { leaseId_tenantId: { leaseId, tenantId } },
      data: { isPrimary: true },
    });
    return tx.lease.findUniqueOrThrow({
      where: { id: leaseId },
      include: { tenants: { include: { tenant: true } } },
    });
  });
}
