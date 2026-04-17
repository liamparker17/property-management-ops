import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';

async function getTenantByUserId(userId: string) {
  const tenant = await db.tenant.findFirst({
    where: { userId },
    select: { id: true, orgId: true, firstName: true, lastName: true, email: true, phone: true, archivedAt: true },
  });
  if (!tenant) throw ApiError.notFound('No tenant record linked to this account');
  return tenant;
}

export async function getTenantProfile(userId: string) {
  return getTenantByUserId(userId);
}

export async function getActiveLeaseForTenant(userId: string) {
  const tenant = await getTenantByUserId(userId);
  const leaseTenant = await db.leaseTenant.findFirst({
    where: { tenantId: tenant.id, lease: { state: 'ACTIVE' } },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          tenants: { include: { tenant: { select: { id: true, firstName: true, lastName: true } } } },
          documents: { orderBy: { createdAt: 'desc' } },
        },
      },
    },
  });
  return leaseTenant?.lease ?? null;
}

export async function getPendingLeaseForTenant(userId: string) {
  const tenant = await getTenantByUserId(userId);
  const leaseTenant = await db.leaseTenant.findFirst({
    where: { tenantId: tenant.id, lease: { state: 'DRAFT' } },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } },
          documents: { orderBy: { createdAt: 'desc' } },
          signatures: { where: { tenantId: tenant.id } },
          reviewRequests: { where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' } },
        },
      },
    },
    orderBy: { lease: { startDate: 'asc' } },
  });
  if (!leaseTenant) return null;
  return { ...leaseTenant.lease, tenantRecordId: tenant.id };
}

export async function getTenantLeases(userId: string) {
  const tenant = await getTenantByUserId(userId);
  const rows = await db.leaseTenant.findMany({
    where: { tenantId: tenant.id },
    include: {
      lease: {
        include: {
          unit: { include: { property: { select: { name: true, city: true } } } },
        },
      },
    },
    orderBy: { lease: { startDate: 'desc' } },
  });
  return rows.map((r) => r.lease);
}

export async function listTenantDocuments(userId: string) {
  const tenant = await getTenantByUserId(userId);
  const leaseTenants = await db.leaseTenant.findMany({
    where: { tenantId: tenant.id },
    select: { leaseId: true },
  });
  const leaseIds = leaseTenants.map((lt) => lt.leaseId);
  return db.document.findMany({
    where: {
      orgId: tenant.orgId,
      OR: [{ leaseId: { in: leaseIds } }, { tenantId: tenant.id }],
    },
    include: {
      lease: { include: { unit: { include: { property: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTenantDocumentForDownload(userId: string, documentId: string) {
  const tenant = await getTenantByUserId(userId);
  const leaseTenants = await db.leaseTenant.findMany({
    where: { tenantId: tenant.id },
    select: { leaseId: true },
  });
  const leaseIds = leaseTenants.map((lt) => lt.leaseId);
  const doc = await db.document.findFirst({
    where: {
      id: documentId,
      orgId: tenant.orgId,
      OR: [{ leaseId: { in: leaseIds } }, { tenantId: tenant.id }],
    },
  });
  if (!doc) throw ApiError.notFound('Document not found');
  return doc;
}
