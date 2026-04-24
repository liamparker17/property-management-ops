import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';

import { createNotification } from '@/lib/services/notifications';
import type {
  signLeaseSchema,
  createReviewRequestSchema,
  respondReviewRequestSchema,
} from '@/lib/zod/signature';

async function getTenantForUser(userId: string) {
  const tenant = await db.tenant.findFirst({
    where: { userId },
    select: { id: true, orgId: true, firstName: true, lastName: true },
  });
  if (!tenant) throw ApiError.notFound('Tenant profile not found');
  return tenant;
}

async function assertTenantOnLease(tenantId: string, leaseId: string) {
  const link = await db.leaseTenant.findUnique({
    where: { leaseId_tenantId: { leaseId, tenantId } },
  });
  if (!link) throw ApiError.forbidden('Not a tenant on this lease');
}

async function notifyOps(
  orgId: string,
  actorUserId: string,
  input: {
    type: string;
    subject: string;
    body: string;
    entityType: string;
    entityId: string;
    payload?: unknown;
  },
) {
  const recipients = await db.user.findMany({
    where: {
      orgId,
      role: { in: ['ADMIN', 'PROPERTY_MANAGER'] },
      disabledAt: null,
    },
    select: { id: true, role: true },
  });

  const ctx = {
    orgId,
    userId: actorUserId,
    role: 'TENANT' as const,
    user: {
      id: actorUserId,
      orgId,
      role: 'TENANT' as const,
      landlordId: null,
      managingAgentId: null,
      smsOptIn: false,
    },
  };

  await Promise.all(
    recipients.map((recipient) =>
      createNotification(ctx, {
        userId: recipient.id,
        role: recipient.role,
        type: input.type,
        subject: input.subject,
        body: input.body,
        payload: input.payload,
        entityType: input.entityType,
        entityId: input.entityId,
      }),
    ),
  );
}

export type LeaseSignatureMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function signLeaseAsTenant(
  userId: string,
  leaseId: string,
  input: z.infer<typeof signLeaseSchema>,
  meta: LeaseSignatureMeta,
) {
  const tenant = await getTenantForUser(userId);
  await assertTenantOnLease(tenant.id, leaseId);

  const existing = await db.leaseSignature.findUnique({
    where: { leaseId_tenantId: { leaseId, tenantId: tenant.id } },
  });
  if (existing) throw ApiError.conflict('You have already signed this lease');

  const signature = await db.leaseSignature.create({
    data: {
      leaseId,
      tenantId: tenant.id,
      signedName: input.signedName,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationText: input.locationText ?? null,
    },
  });

  const lease = await db.lease.findUnique({
    where: { id: leaseId },
    select: { unit: { select: { label: true, property: { select: { name: true } } } } },
  });
  if (lease) {
    const unitLabel = `${lease.unit.property.name} / ${lease.unit.label}`;
    await notifyOps(tenant.orgId, userId, {
      type: 'LEASE_SIGNED',
      subject: 'Lease signed',
      body: `${tenant.firstName} ${tenant.lastName}`.trim() + ` signed for ${unitLabel}.`,
      entityType: 'Lease',
      entityId: leaseId,
      payload: { leaseId, tenantId: tenant.id },
    });
  }

  return signature;
}

export async function getTenantSignatureForLease(userId: string, leaseId: string) {
  const tenant = await getTenantForUser(userId);
  return db.leaseSignature.findUnique({
    where: { leaseId_tenantId: { leaseId, tenantId: tenant.id } },
  });
}

export async function listLeaseSignatures(ctx: RouteCtx, leaseId: string) {
  const lease = await db.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  return db.leaseSignature.findMany({
    where: { leaseId },
    orderBy: { signedAt: 'desc' },
  });
}

export async function createReviewRequest(
  userId: string,
  leaseId: string,
  input: z.infer<typeof createReviewRequestSchema>,
) {
  const tenant = await getTenantForUser(userId);
  await assertTenantOnLease(tenant.id, leaseId);
  const request = await db.leaseReviewRequest.create({
    data: {
      leaseId,
      tenantId: tenant.id,
      clauseExcerpt: input.clauseExcerpt,
      tenantNote: input.tenantNote,
    },
  });

  const lease = await db.lease.findUnique({
    where: { id: leaseId },
    select: { unit: { select: { label: true, property: { select: { name: true } } } } },
  });
  if (lease) {
    await notifyOps(tenant.orgId, userId, {
      type: 'LEASE_REVIEW_REQUEST',
      subject: 'Lease review request',
      body:
        `${tenant.firstName} ${tenant.lastName}`.trim() +
        ` flagged a clause for ${lease.unit.property.name} / ${lease.unit.label}.`,
      entityType: 'LeaseReviewRequest',
      entityId: request.id,
      payload: { leaseId, clauseExcerpt: input.clauseExcerpt },
    });
  }

  return request;
}

export async function listTenantReviewRequests(userId: string, leaseId: string) {
  const tenant = await getTenantForUser(userId);
  await assertTenantOnLease(tenant.id, leaseId);
  return db.leaseReviewRequest.findMany({
    where: { leaseId, tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listLeaseReviewRequests(ctx: RouteCtx, leaseId: string) {
  const lease = await db.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  const rows = await db.leaseReviewRequest.findMany({
    where: { leaseId },
    orderBy: { createdAt: 'desc' },
  });
  const tenantIds = Array.from(new Set(rows.map((r) => r.tenantId)));
  const tenants = tenantIds.length
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  return rows.map((r) => ({ ...r, tenant: tenantMap.get(r.tenantId) ?? null }));
}

export async function respondToReviewRequest(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof respondReviewRequestSchema>,
) {
  const existing = await db.leaseReviewRequest.findFirst({
    where: { id, lease: { orgId: ctx.orgId } },
    select: { id: true },
  });
  if (!existing) throw ApiError.notFound('Review request not found');
  const updated = await db.leaseReviewRequest.update({
    where: { id },
    data: {
      status: input.status,
      pmResponse: input.pmResponse ?? null,
      respondedAt: new Date(),
    },
  });

  const tenant = await db.tenant.findUnique({
    where: { id: updated.tenantId },
    select: { firstName: true, lastName: true, userId: true },
  });
  if (tenant?.userId) {
    await createNotification(ctx, {
      userId: tenant.userId,
      role: 'TENANT',
      type: 'LEASE_REVIEW_RESPONSE',
      subject: 'Lease review response',
      body: `Your lease review request has been ${updated.status.toLowerCase()}.`,
      payload: { reviewRequestId: updated.id, status: updated.status },
      entityType: 'LeaseReviewRequest',
      entityId: updated.id,
    });
  }

  return updated;
}
