import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { createPropertySchema, updatePropertySchema } from '@/lib/zod/property';

export async function listProperties(ctx: RouteCtx) {
  return db.property.findMany({
    where: { orgId: ctx.orgId, deletedAt: null },
    orderBy: { name: 'asc' },
    include: { _count: { select: { units: true } } },
  });
}

export async function getProperty(ctx: RouteCtx, id: string) {
  const p = await db.property.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    include: { units: { orderBy: { label: 'asc' } } },
  });
  if (!p) throw ApiError.notFound('Property not found');
  return p;
}

export async function createProperty(
  ctx: RouteCtx,
  input: z.infer<typeof createPropertySchema>,
) {
  const { autoCreateMainUnit, ...data } = input;
  return db.$transaction(async (tx) => {
    const property = await tx.property.create({ data: { ...data, orgId: ctx.orgId } });
    if (autoCreateMainUnit) {
      await tx.unit.create({
        data: { orgId: ctx.orgId, propertyId: property.id, label: 'Main' },
      });
    }
    return property;
  });
}

export async function updateProperty(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updatePropertySchema>,
) {
  const existing = await db.property.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) throw ApiError.notFound('Property not found');
  return db.property.update({ where: { id }, data: input });
}

export async function softDeleteProperty(ctx: RouteCtx, id: string) {
  const existing = await db.property.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    include: {
      units: {
        include: { leases: { where: { state: { in: ['DRAFT', 'ACTIVE'] } }, select: { id: true } } },
      },
    },
  });
  if (!existing) throw ApiError.notFound('Property not found');
  const blockingLeases = existing.units.flatMap((u) => u.leases);
  if (blockingLeases.length > 0) {
    throw ApiError.conflict('Cannot delete: property has active or draft leases', {
      blockingLeaseIds: blockingLeases.map((l) => l.id),
    });
  }
  return db.property.update({ where: { id }, data: { deletedAt: new Date() } });
}
