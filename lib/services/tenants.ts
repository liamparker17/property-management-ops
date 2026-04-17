import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
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

export async function deleteTenant(ctx: RouteCtx, id: string) {
  const tenant = await db.tenant.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true, archivedAt: true, userId: true },
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  if (!tenant.archivedAt) {
    throw ApiError.conflict('Archive the tenant before permanently deleting');
  }

  await db.$transaction(async (tx) => {
    await tx.leaseTenant.deleteMany({ where: { tenantId: id } });
    await tx.document.updateMany({ where: { tenantId: id }, data: { tenantId: null } });
    await tx.maintenanceRequest.deleteMany({ where: { tenantId: id } });
    await tx.leaseSignature.deleteMany({ where: { tenantId: id } });
    await tx.leaseReviewRequest.deleteMany({ where: { tenantId: id } });
    await tx.tenant.delete({ where: { id } });
    if (tenant.userId) {
      await tx.user.delete({ where: { id: tenant.userId } });
    }
  });

  return { ok: true };
}

function generateTempPassword() {
  return randomBytes(9).toString('base64url');
}

export async function inviteTenantToPortal(ctx: RouteCtx, tenantId: string) {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, orgId: ctx.orgId },
    select: { id: true, email: true, firstName: true, lastName: true, userId: true, archivedAt: true },
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  if (tenant.archivedAt) throw ApiError.conflict('Cannot invite an archived tenant');
  if (!tenant.email) throw ApiError.validation('Tenant needs an email before being invited');
  if (tenant.userId) throw ApiError.conflict('Tenant already has a portal account');

  const clash = await db.user.findUnique({ where: { email: tenant.email } });
  if (clash) throw ApiError.conflict('A user with this email already exists');

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: tenant.email!,
        name: `${tenant.firstName} ${tenant.lastName}`.trim(),
        role: Role.TENANT,
        orgId: ctx.orgId,
        passwordHash,
      },
    });
    await tx.tenant.update({ where: { id: tenant.id }, data: { userId: user.id } });
  });

  return { email: tenant.email, tempPassword };
}
