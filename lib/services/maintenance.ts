import { MaintenanceStatus } from '@prisma/client';
import type { MaintenanceQuote, MaintenanceRequest, MaintenanceWorklog } from '@prisma/client';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import {
  sendMaintenanceCreatedOpsSms,
  sendMaintenanceCreatedTenantSms,
  sendMaintenanceStatusTenantSms,
} from '@/lib/sms';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import { writeAudit } from '@/lib/services/audit';
import { recordSnapshotEvent } from '@/lib/services/snapshots';
import { ensureTrustAccount } from '@/lib/services/trust';
import type {
  addMaintenanceWorklogSchema,
  assignVendorSchema,
  captureMaintenanceInvoiceSchema,
  captureQuoteSchema,
  completeMaintenanceSchema,
  createMaintenanceRequestSchema,
  scheduleMaintenanceSchema,
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
      unit: {
        select: {
          label: true,
          property: {
            select: { id: true, name: true, assignedAgentId: true },
          },
        },
      },
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

  void recordSnapshotEvent(
    { orgId: tenant.orgId, userId, role: 'TENANT' },
    'MAINTENANCE',
    {
      propertyId: request.unit.property.id,
      agentId: request.unit.property.assignedAgentId ?? undefined,
    },
  );

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
      unit: {
        select: {
          property: { select: { id: true, assignedAgentId: true } },
        },
      },
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

  if (statusChanged) {
    void recordSnapshotEvent(ctx, 'MAINTENANCE', {
      propertyId: updated.unit.property.id,
      agentId: updated.unit.property.assignedAgentId ?? undefined,
    });
  }

  return updated;
}

async function requireRequestInOrg(ctx: RouteCtx, id: string) {
  const row = await db.maintenanceRequest.findFirst({
    where: { id, orgId: ctx.orgId },
  });
  if (!row) throw ApiError.notFound('Request not found');
  return row;
}

async function loadMaintenanceScope(ctx: RouteCtx, id: string) {
  const row = await db.maintenanceRequest.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      unit: {
        select: {
          property: {
            select: { id: true, landlordId: true, assignedAgentId: true },
          },
        },
      },
    },
  });
  if (!row) throw ApiError.notFound('Request not found');
  return row.unit.property;
}

export async function assignVendor(
  ctx: RouteCtx,
  requestId: string,
  input: z.infer<typeof assignVendorSchema>,
): Promise<MaintenanceRequest> {
  const property = await loadMaintenanceScope(ctx, requestId);
  const vendor = await db.vendor.findFirst({
    where: { id: input.vendorId, orgId: ctx.orgId },
    select: { id: true, name: true, archivedAt: true },
  });
  if (!vendor) throw ApiError.notFound('Vendor not found');
  if (vendor.archivedAt) throw ApiError.conflict('Vendor is archived');

  const updated = await db.maintenanceRequest.update({
    where: { id: requestId },
    data: {
      assignedVendorId: vendor.id,
      status: MaintenanceStatus.IN_PROGRESS,
      ...(input.estimatedCostCents !== undefined
        ? { estimatedCostCents: input.estimatedCostCents }
        : {}),
      ...(input.scheduledFor !== undefined
        ? { scheduledFor: new Date(input.scheduledFor) }
        : {}),
    },
  });

  await db.maintenanceWorklog.create({
    data: {
      requestId: updated.id,
      authorId: ctx.userId,
      body: `Assigned to ${vendor.name}`,
    },
  });

  await writeAudit(ctx, {
    entityType: 'MaintenanceRequest',
    entityId: updated.id,
    action: 'maintenance.assignVendor',
    payload: {
      vendorId: vendor.id,
      estimatedCostCents: input.estimatedCostCents,
      scheduledFor: input.scheduledFor,
    },
  });

  void recordSnapshotEvent(ctx, 'MAINTENANCE', {
    propertyId: property.id,
    agentId: property.assignedAgentId ?? undefined,
  });

  return updated;
}

export async function captureQuote(
  ctx: RouteCtx,
  requestId: string,
  input: z.infer<typeof captureQuoteSchema>,
): Promise<MaintenanceQuote> {
  const request = await requireRequestInOrg(ctx, requestId);

  if (input.vendorId) {
    const vendor = await db.vendor.findFirst({
      where: { id: input.vendorId, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!vendor) throw ApiError.notFound('Vendor not found');
  }

  const quote = await db.maintenanceQuote.create({
    data: {
      requestId: request.id,
      vendorId: input.vendorId ?? null,
      amountCents: input.amountCents,
      documentStorageKey: input.documentStorageKey ?? null,
      note: input.note ?? null,
    },
  });

  if (request.quotedCostCents === null) {
    await db.maintenanceRequest.update({
      where: { id: request.id },
      data: { quotedCostCents: input.amountCents },
    });
  }

  await writeAudit(ctx, {
    entityType: 'MaintenanceRequest',
    entityId: request.id,
    action: 'maintenance.captureQuote',
    payload: {
      quoteId: quote.id,
      vendorId: quote.vendorId,
      amountCents: quote.amountCents,
    },
  });

  return quote;
}

export async function scheduleMaintenance(
  ctx: RouteCtx,
  requestId: string,
  input: z.infer<typeof scheduleMaintenanceSchema>,
): Promise<MaintenanceRequest> {
  const request = await requireRequestInOrg(ctx, requestId);
  const property = await loadMaintenanceScope(ctx, requestId);
  if (!request.assignedVendorId) {
    throw ApiError.conflict('Assign a vendor before scheduling');
  }

  const updated = await db.maintenanceRequest.update({
    where: { id: request.id },
    data: { scheduledFor: new Date(input.scheduledFor) },
  });

  await writeAudit(ctx, {
    entityType: 'MaintenanceRequest',
    entityId: updated.id,
    action: 'maintenance.schedule',
    payload: { scheduledFor: input.scheduledFor },
  });

  void recordSnapshotEvent(ctx, 'MAINTENANCE', {
    propertyId: property.id,
    agentId: property.assignedAgentId ?? undefined,
  });

  return updated;
}

export async function completeMaintenance(
  ctx: RouteCtx,
  requestId: string,
  input: z.infer<typeof completeMaintenanceSchema>,
): Promise<MaintenanceRequest> {
  const request = await requireRequestInOrg(ctx, requestId);
  const property = await loadMaintenanceScope(ctx, requestId);

  const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();

  const updated = await db.maintenanceRequest.update({
    where: { id: request.id },
    data: {
      completedAt,
      status: MaintenanceStatus.RESOLVED,
      resolvedAt: request.resolvedAt ?? completedAt,
    },
  });

  await db.maintenanceWorklog.create({
    data: {
      requestId: updated.id,
      authorId: ctx.userId,
      body: input.summary?.trim()
        ? `Completed — ${input.summary.trim()}`
        : 'Completed',
    },
  });

  await writeAudit(ctx, {
    entityType: 'MaintenanceRequest',
    entityId: updated.id,
    action: 'maintenance.complete',
    payload: { completedAt: completedAt.toISOString(), summary: input.summary },
  });

  void recordSnapshotEvent(ctx, 'MAINTENANCE', {
    propertyId: property.id,
    agentId: property.assignedAgentId ?? undefined,
  });

  return updated;
}

export async function captureMaintenanceInvoice(
  ctx: RouteCtx,
  requestId: string,
  input: z.infer<typeof captureMaintenanceInvoiceSchema>,
): Promise<MaintenanceRequest> {
  const request = await db.maintenanceRequest.findFirst({
    where: { id: requestId, orgId: ctx.orgId },
    include: {
      unit: {
        select: {
          property: { select: { id: true, landlordId: true, assignedAgentId: true } },
        },
      },
    },
  });
  if (!request) throw ApiError.notFound('Request not found');

  const landlordId = request.unit.property.landlordId;
  if (!landlordId) throw ApiError.conflict('Property has no landlord assigned');

  const trustAccount = await ensureTrustAccount(ctx, landlordId);

  await db.trustLedgerEntry.create({
    data: {
      trustAccountId: trustAccount.id,
      landlordId,
      type: 'FEE',
      amountCents: -input.invoiceCents,
      occurredAt: new Date(),
      sourceType: 'MaintenanceRequest',
      sourceId: request.id,
      note: `Maintenance — ${request.title}`,
    },
  });

  const updated = await db.maintenanceRequest.update({
    where: { id: request.id },
    data: {
      invoiceCents: input.invoiceCents,
      ...(input.invoiceBlobKey !== undefined
        ? { invoiceBlobKey: input.invoiceBlobKey }
        : {}),
    },
  });

  await writeAudit(ctx, {
    entityType: 'MaintenanceRequest',
    entityId: updated.id,
    action: 'maintenance.captureInvoice',
    payload: {
      invoiceCents: input.invoiceCents,
      landlordId,
      trustAccountId: trustAccount.id,
    },
  });

  void recordSnapshotEvent(ctx, 'MAINTENANCE', {
    propertyId: request.unit.property.id,
    agentId: request.unit.property.assignedAgentId ?? undefined,
  });
  void recordSnapshotEvent(ctx, 'LEDGER', { landlordId });

  return updated;
}

export async function addMaintenanceWorklog(
  ctx: RouteCtx,
  requestId: string,
  input: z.infer<typeof addMaintenanceWorklogSchema>,
): Promise<MaintenanceWorklog> {
  const request = await requireRequestInOrg(ctx, requestId);

  const entry = await db.maintenanceWorklog.create({
    data: {
      requestId: request.id,
      authorId: ctx.userId,
      body: input.body,
    },
  });

  await writeAudit(ctx, {
    entityType: 'MaintenanceRequest',
    entityId: request.id,
    action: 'maintenance.addWorklog',
    payload: { worklogId: entry.id },
  });

  return entry;
}
