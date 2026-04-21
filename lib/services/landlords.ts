import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { createLandlordSchema, updateLandlordSchema } from '@/lib/zod/landlords';

function normalise(input: Partial<z.infer<typeof createLandlordSchema>>) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.email !== undefined ? { email: input.email || null } : {}),
    ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
    ...(input.vatNumber !== undefined ? { vatNumber: input.vatNumber || null } : {}),
    ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
  };
}

export async function listLandlords(ctx: RouteCtx, opts: { includeArchived?: boolean } = {}) {
  return db.landlord.findMany({
    where: {
      orgId: ctx.orgId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      vatNumber: true,
      archivedAt: true,
      _count: { select: { properties: true } },
    },
  });
}

export async function getLandlord(ctx: RouteCtx, id: string) {
  const landlord = await db.landlord.findFirst({
    where: { id, orgId: ctx.orgId },
  });
  if (!landlord) throw ApiError.notFound('Landlord not found');
  return landlord;
}

export async function createLandlord(
  ctx: RouteCtx,
  input: z.infer<typeof createLandlordSchema>,
) {
  return db.landlord.create({
    data: {
      orgId: ctx.orgId,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      vatNumber: input.vatNumber || null,
      notes: input.notes || null,
    },
  });
}

export async function updateLandlord(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateLandlordSchema>,
) {
  const existing = await db.landlord.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!existing) throw ApiError.notFound('Landlord not found');
  const { archived, ...rest } = input;
  return db.landlord.update({
    where: { id },
    data: {
      ...normalise(rest),
      ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
    },
  });
}
