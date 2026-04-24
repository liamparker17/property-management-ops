import type { Vendor } from '@prisma/client';
import type { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import { writeAudit } from '@/lib/services/audit';
import type { createVendorSchema, updateVendorSchema } from '@/lib/zod/vendors';

export async function listVendors(
  ctx: RouteCtx,
  filters: { includeArchived?: boolean; category?: string } = {},
): Promise<Vendor[]> {
  return db.vendor.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters.includeArchived ? {} : { archivedAt: null }),
      ...(filters.category ? { categories: { has: filters.category } } : {}),
    },
    orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
  });
}

export async function getVendor(ctx: RouteCtx, id: string): Promise<Vendor> {
  const row = await db.vendor.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!row) throw ApiError.notFound('Vendor not found');
  return row;
}

export async function createVendor(
  ctx: RouteCtx,
  input: z.infer<typeof createVendorSchema>,
): Promise<Vendor> {
  const row = await db.vendor.create({
    data: {
      orgId: ctx.orgId,
      name: input.name,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      categories: input.categories ?? [],
    },
  });
  await writeAudit(ctx, {
    entityType: 'Vendor',
    entityId: row.id,
    action: 'vendor.create',
    payload: { name: row.name, categories: row.categories },
  });
  return row;
}

export async function updateVendor(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateVendorSchema>,
): Promise<Vendor> {
  const existing = await getVendor(ctx, id);
  const row = await db.vendor.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.categories !== undefined ? { categories: input.categories } : {}),
    },
  });
  await writeAudit(ctx, {
    entityType: 'Vendor',
    entityId: row.id,
    action: 'vendor.update',
    diff: input,
  });
  return row;
}

export async function archiveVendor(ctx: RouteCtx, id: string): Promise<Vendor> {
  const existing = await getVendor(ctx, id);
  const row = await db.vendor.update({
    where: { id: existing.id },
    data: { archivedAt: existing.archivedAt ?? new Date() },
  });
  await writeAudit(ctx, {
    entityType: 'Vendor',
    entityId: row.id,
    action: 'vendor.archive',
  });
  return row;
}
