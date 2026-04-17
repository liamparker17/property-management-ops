import { MaintenanceStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import {
  sendMaintenanceCreatedOpsSms,
  sendMaintenanceCreatedTenantSms,
  sendMaintenanceStatusTenantSms,
} from '@/lib/sms';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type {
  createMaintenanceRequestSchema,
  updateMaintenanceRequestSchema,
} from '@/lib/zod/maintenance';

async function getTenantForUser(userId: string) {
  const tenant = await db.tenant.findFirst({
    where: { userId },
    select: { id: true, orgId: true },
  });
  if (!tenant) throw ApiError.notFound('Tenant profile not found');
  return tenant;
}

async function findActiveUnitForTenant(tenantId: string) {
  const today = new Date();
  const active = await db.leaseTenant.findFirst({
    where: {
      tenantId,
      lease: {
        state: 'ACTIVE',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    },
    include: { lease: { select: { unitId: true } } },
    orderBy: { lease: { startDate: 'desc' } },
  });
  if (!active) throw ApiError.conflict('No active lease — cannot log a repair');
  return active.lease.unitId;
}

export async function createTenantMaintenanceRequest(
  userId: string,
  input: z.infer<typeof createMaintenanceRequestSchema>,
) {
  const tenant = await getTenantForUser(userId);
  const unitId = await findActiveUnitForTenant(tenant.id);
  const request = await db.maintenanceRequest.create({
    data: {
      orgId: tenant.orgId,
      tenantId: tenant.id,
      unitId,
      title: input.title,
      description: input.description,
      priority: input.priority,
    },
    include: {
      tenant: { select: { firstName: true, lastName: true, phone: true } },
      unit: { select: { label: true, property: { select: { name: true } } } },
    },
  });

  const tenantName = `${request.tenant.firstName} ${request.tenant.lastName}`.trim();
  const unitLabel = `${request.unit.property.name} · ${request.unit.label}`;

  await Promise.allSettled([
    sendMaintenanceCreatedOpsSms({
      ticketTitle: request.title,
      priority: request.priority,
      tenantName,
      unitLabel,
    }),
    request.tenant.phone
      ? sendMaintenanceCreatedTenantSms({
          to: request.tenant.phone,
          tenantName,
          ticketTitle: request.title,
        })
      : Promise.resolve(),
  ]);

  return request;
}

export async function listTenantMaintenanceRequests(userId: string) {
  const tenant = await getTenantForUser(userId);
  return db.maintenanceRequest.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    include: {
      unit: { select: { label: true, property: { select: { name: true } } } },
    },
  });
}

export async function getTenantMaintenanceRequest(userId: string, id: string) {
  const tenant = await getTenantForUser(userId);
  const row = await db.maintenanceRequest.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      unit: { select: { label: true, property: { select: { name: true } } } },
    },
  });
  if (!row) throw ApiError.notFound('Request not found');
  return row;
}

export async function listMaintenanceRequests(ctx: RouteCtx, opts: { status?: MaintenanceStatus } = {}) {
  return db.maintenanceRequest.findMany({
    where: { orgId: ctx.orgId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      tenant: { select: { firstName: true, lastName: true } },
      unit: { select: { label: true, property: { select: { name: true } } } },
    },
  });
}

export async function getMaintenanceRequest(ctx: RouteCtx, id: string) {
  const row = await db.maintenanceRequest.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      tenant: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      unit: { select: { id: true, label: true, property: { select: { id: true, name: true } } } },
    },
  });
  if (!row) throw ApiError.notFound('Request not found');
  return row;
}

export async function updateMaintenanceRequest(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateMaintenanceRequestSchema>,
) {
  const existing = await db.maintenanceRequest.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true, status: true },
  });
  if (!existing) throw ApiError.notFound('Request not found');

  const becameResolved =
    input.status === 'RESOLVED' && existing.status !== 'RESOLVED';
  const becameUnresolved =
    input.status && input.status !== 'RESOLVED' && existing.status === 'RESOLVED';
  const statusChanged = Boolean(input.status && input.status !== existing.status);

  const updated = await db.maintenanceRequest.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
      ...(becameResolved ? { resolvedAt: new Date() } : {}),
      ...(becameUnresolved ? { resolvedAt: null } : {}),
    },
    include: {
      tenant: { select: { firstName: true, lastName: true, phone: true } },
    },
  });

  if (statusChanged && updated.tenant.phone) {
    const tenantName = `${updated.tenant.firstName} ${updated.tenant.lastName}`.trim();
    await sendMaintenanceStatusTenantSms({
      to: updated.tenant.phone,
      tenantName,
      ticketTitle: updated.title,
      status: updated.status,
    });
  }

  return updated;
}
