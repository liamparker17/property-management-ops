import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
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

  return db.leaseSignature.create({
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
  return db.leaseReviewRequest.create({
    data: {
      leaseId,
      tenantId: tenant.id,
      clauseExcerpt: input.clauseExcerpt,
      tenantNote: input.tenantNote,
    },
  });
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
  return db.leaseReviewRequest.update({
    where: { id },
    data: {
      status: input.status,
      pmResponse: input.pmResponse ?? null,
      respondedAt: new Date(),
    },
  });
}
