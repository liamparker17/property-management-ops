import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { createUnitSchema, updateUnitSchema } from '@/lib/zod/unit';

export type UnitOccupancy = 'VACANT' | 'OCCUPIED' | 'UPCOMING' | 'CONFLICT';

export async function getUnitOccupancy(
  unitId: string,
  orgId: string,
  on: Date = new Date(),
): Promise<{ state: UnitOccupancy; coveringLeaseId: string | null; upcomingLeaseId: string | null }> {
  const leases = await db.lease.findMany({
    where: { unitId, orgId, state: 'ACTIVE' },
    select: { id: true, startDate: true, endDate: true },
    orderBy: { startDate: 'asc' },
  });
  const today = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), on.getUTCDate()));

  const covering = leases.filter((l) => l.startDate <= today && l.endDate >= today);
  if (covering.length > 1) {
    return { state: 'CONFLICT', coveringLeaseId: covering[0].id, upcomingLeaseId: null };
  }
  if (covering.length === 1) {
    const upcoming = leases.find((l) => l.startDate > today) ?? null;
    return { state: 'OCCUPIED', coveringLeaseId: covering[0].id, upcomingLeaseId: upcoming?.id ?? null };
  }
  const upcoming = leases.find((l) => l.startDate > today);
  if (upcoming) return { state: 'UPCOMING', coveringLeaseId: null, upcomingLeaseId: upcoming.id };
  return { state: 'VACANT', coveringLeaseId: null, upcomingLeaseId: null };
}

export async function listUnits(ctx: RouteCtx, opts: { propertyId?: string }) {
  return db.unit.findMany({
    where: {
      orgId: ctx.orgId,
      ...(opts.propertyId ? { propertyId: opts.propertyId } : {}),
      property: { deletedAt: null },
    },
    orderBy: [{ propertyId: 'asc' }, { label: 'asc' }],
    include: { property: { select: { id: true, name: true } } },
  });
}

export async function getUnit(ctx: RouteCtx, id: string) {
  const unit = await db.unit.findFirst({
    where: { id, orgId: ctx.orgId, property: { deletedAt: null } },
    include: {
      property: true,
      leases: {
        orderBy: { startDate: 'desc' },
        include: { tenants: { include: { tenant: true } } },
      },
    },
  });
  if (!unit) throw ApiError.notFound('Unit not found');
  const occupancy = await getUnitOccupancy(unit.id, ctx.orgId);
  return { ...unit, occupancy };
}

export async function createUnit(ctx: RouteCtx, input: z.infer<typeof createUnitSchema>) {
  const property = await db.property.findFirst({
    where: { id: input.propertyId, orgId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!property) throw ApiError.notFound('Property not found');
  try {
    return await db.unit.create({ data: { ...input, orgId: ctx.orgId } });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unique')) {
      throw ApiError.conflict('A unit with that label already exists on this property');
    }
    throw err;
  }
}

export async function updateUnit(ctx: RouteCtx, id: string, input: z.infer<typeof updateUnitSchema>) {
  const existing = await db.unit.findFirst({ where: { id, orgId: ctx.orgId }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Unit not found');
  return db.unit.update({ where: { id }, data: input });
}

export async function deleteUnit(ctx: RouteCtx, id: string) {
  const existing = await db.unit.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { leases: { where: { state: { in: ['DRAFT', 'ACTIVE'] } }, select: { id: true } } },
  });
  if (!existing) throw ApiError.notFound('Unit not found');
  if (existing.leases.length > 0) {
    throw ApiError.conflict('Cannot delete: unit has active or draft leases');
  }
  return db.unit.delete({ where: { id } });
}
