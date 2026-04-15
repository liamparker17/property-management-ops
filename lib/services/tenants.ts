import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { createTenantSchema, updateTenantSchema } from '@/lib/zod/tenant';

export async function listTenants(ctx: RouteCtx, opts: { includeArchived?: boolean } = {}) {
  return db.tenant.findMany({
    where: {
      orgId: ctx.orgId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: { _count: { select: { leases: true } } },
  });
}

export async function getTenant(ctx: RouteCtx, id: string) {
  const tenant = await db.tenant.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      leases: {
        include: {
          lease: {
            include: { unit: { include: { property: { select: { id: true, name: true } } } } },
          },
        },
      },
    },
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  return tenant;
}

export async function detectDuplicates(
  ctx: RouteCtx,
  input: { email?: string | null; idNumber?: string | null; phone?: string | null },
) {
  const or: Array<{ email?: string } | { idNumber?: string } | { phone?: string }> = [];
  if (input.email) or.push({ email: input.email });
  if (input.idNumber) or.push({ idNumber: input.idNumber });
  if (input.phone) or.push({ phone: input.phone });
  if (or.length === 0) return [];
  return db.tenant.findMany({
    where: { orgId: ctx.orgId, OR: or },
    select: { id: true, firstName: true, lastName: true, email: true, idNumber: true, phone: true },
    take: 5,
  });
}

export async function createTenant(ctx: RouteCtx, input: z.infer<typeof createTenantSchema>) {
  return db.tenant.create({ data: { ...input, orgId: ctx.orgId } });
}

export async function updateTenant(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateTenantSchema>,
) {
  const existing = await db.tenant.findFirst({ where: { id, orgId: ctx.orgId }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Tenant not found');
  return db.tenant.update({ where: { id }, data: input });
}

export async function archiveTenant(ctx: RouteCtx, id: string) {
  const existing = await db.tenant.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      leases: {
        include: { lease: { select: { state: true, startDate: true, endDate: true } } },
      },
    },
  });
  if (!existing) throw ApiError.notFound('Tenant not found');
  const today = new Date();
  const blocking = existing.leases.filter((lt) => {
    const l = lt.lease;
    if (l.state === 'ACTIVE' && l.endDate >= today) return true;
    if (l.state === 'DRAFT') return true;
    return false;
  });
  if (blocking.length > 0) {
    throw ApiError.conflict('Cannot archive tenant with active or draft leases');
  }
  return db.tenant.update({ where: { id }, data: { archivedAt: new Date() } });
}

export async function unarchiveTenant(ctx: RouteCtx, id: string) {
  const existing = await db.tenant.findFirst({ where: { id, orgId: ctx.orgId }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Tenant not found');
  return db.tenant.update({ where: { id }, data: { archivedAt: null } });
}
