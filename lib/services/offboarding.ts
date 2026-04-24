import type {
  ChargeResponsibility,
  DepositSettlement,
  MoveOutCharge,
  OffboardingCase,
  OffboardingTask,
} from '@prisma/client';
import { put } from '@vercel/blob';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';
import { getOrgFeatures } from '@/lib/services/org-features';
import { writeLedgerEntry } from '@/lib/services/trust.js';
import {
  renderSettlementStatement,
  type SettlementChargeData,
} from '@/lib/reports/settlement-pdf';

type Uploader = (path: string, body: Buffer, contentType: string) => Promise<{ url: string; pathname: string }>;

let currentUploader: Uploader = async (path, body, contentType) => {
  const result = await put(path, body, { access: 'public', addRandomSuffix: true, contentType });
  return { url: result.url, pathname: result.pathname };
};

export function __setSettlementUploaderForTests(u: Uploader) {
  currentUploader = u;
}

export const DEFAULT_OFFBOARDING_TASK_LABELS = [
  'Confirm move-out date',
  'Schedule move-out inspection',
  'Collect keys',
  'Apply deposit',
  'Issue deposit statement',
] as const;

const UTILITIES_TASK_LABEL = 'Final meter reading';

export type OffboardingCaseWithChildren = OffboardingCase & {
  tasks: OffboardingTask[];
  charges: MoveOutCharge[];
  settlement: DepositSettlement | null;
};

async function loadCaseInOrg(ctx: RouteCtx, caseId: string): Promise<OffboardingCaseWithChildren> {
  const c = await db.offboardingCase.findFirst({
    where: { id: caseId, orgId: ctx.orgId },
    include: { tasks: { orderBy: { orderIndex: 'asc' } }, charges: true, settlement: true },
  });
  if (!c) throw ApiError.notFound('Offboarding case not found');
  return c;
}

async function loadLeaseInOrg(ctx: RouteCtx, leaseId: string) {
  const lease = await db.lease.findFirst({ where: { id: leaseId, orgId: ctx.orgId } });
  if (!lease) throw ApiError.notFound('Lease not found');
  return lease;
}

async function buildDefaultTaskLabels(orgId: string): Promise<string[]> {
  const flags = await getOrgFeatures(orgId);
  const labels = [...DEFAULT_OFFBOARDING_TASK_LABELS] as string[];
  if (flags.UTILITIES_BILLING) {
    labels.splice(2, 0, UTILITIES_TASK_LABEL);
  }
  return labels;
}

export async function openOffboardingCase(
  ctx: RouteCtx,
  leaseId: string,
): Promise<OffboardingCaseWithChildren> {
  const existing = await db.offboardingCase.findFirst({
    where: { leaseId, orgId: ctx.orgId },
    include: { tasks: { orderBy: { orderIndex: 'asc' } }, charges: true, settlement: true },
  });
  if (existing) return existing;

  await loadLeaseInOrg(ctx, leaseId);
  const labels = await buildDefaultTaskLabels(ctx.orgId);

  const created = await db.offboardingCase.create({
    data: {
      orgId: ctx.orgId,
      leaseId,
      status: 'OPEN',
      tasks: {
        create: labels.map((label, orderIndex) => ({ label, orderIndex })),
      },
    },
    include: { tasks: { orderBy: { orderIndex: 'asc' } }, charges: true, settlement: true },
  });

  await writeAudit(ctx, {
    entityType: 'OffboardingCase',
    entityId: created.id,
    action: 'opened',
    payload: { leaseId, taskCount: labels.length },
  });

  return created;
}

export async function listOffboardingCases(
  ctx: RouteCtx,
  filters?: { status?: string },
): Promise<OffboardingCase[]> {
  return db.offboardingCase.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters?.status ? { status: filters.status } : {}),
    },
    orderBy: { openedAt: 'desc' },
  });
}

export async function getOffboardingCase(
  ctx: RouteCtx,
  id: string,
): Promise<OffboardingCaseWithChildren> {
  return loadCaseInOrg(ctx, id);
}

export async function listOffboardingTasks(
  ctx: RouteCtx,
  caseId: string,
): Promise<OffboardingTask[]> {
  await loadCaseInOrg(ctx, caseId);
  return db.offboardingTask.findMany({
    where: { caseId },
    orderBy: { orderIndex: 'asc' },
  });
}

export async function toggleOffboardingTask(
  ctx: RouteCtx,
  taskId: string,
  done: boolean,
): Promise<OffboardingTask> {
  const task = await db.offboardingTask.findUnique({
    where: { id: taskId },
    include: { case: { select: { orgId: true } } },
  });
  if (!task || task.case.orgId !== ctx.orgId) throw ApiError.notFound('Offboarding task not found');

  const updated = await db.offboardingTask.update({
    where: { id: taskId },
    data: {
      done,
      doneAt: done ? new Date() : null,
      doneById: done ? ctx.userId : null,
    },
  });

  await writeAudit(ctx, {
    entityType: 'OffboardingTask',
    entityId: taskId,
    action: done ? 'completed' : 'reopened',
  });

  return updated;
}

function assertCaseMutable(c: OffboardingCaseWithChildren) {
  if (c.settlement?.finalizedAt) {
    throw ApiError.conflict('Settlement finalised — case is locked');
  }
}

export async function addMoveOutCharge(
  ctx: RouteCtx,
  caseId: string,
  input: {
    label: string;
    amountCents: number;
    responsibility: ChargeResponsibility;
    sourceInspectionItemId?: string;
  },
): Promise<MoveOutCharge> {
  const c = await loadCaseInOrg(ctx, caseId);
  assertCaseMutable(c);

  const charge = await db.moveOutCharge.create({
    data: {
      caseId,
      label: input.label,
      amountCents: input.amountCents,
      responsibility: input.responsibility,
      sourceInspectionItemId: input.sourceInspectionItemId ?? null,
    },
  });

  await writeAudit(ctx, {
    entityType: 'MoveOutCharge',
    entityId: charge.id,
    action: 'created',
    payload: {
      caseId,
      amountCents: input.amountCents,
      responsibility: input.responsibility,
    },
  });

  return charge;
}

export async function removeMoveOutCharge(ctx: RouteCtx, chargeId: string): Promise<void> {
  const charge = await db.moveOutCharge.findUnique({
    where: { id: chargeId },
    include: { case: { include: { settlement: true } } },
  });
  if (!charge || charge.case.orgId !== ctx.orgId) throw ApiError.notFound('Charge not found');
  if (charge.case.settlement?.finalizedAt) {
    throw ApiError.conflict('Settlement finalised — case is locked');
  }

  await db.moveOutCharge.delete({ where: { id: chargeId } });

  await writeAudit(ctx, {
    entityType: 'MoveOutCharge',
    entityId: chargeId,
    action: 'deleted',
    payload: { caseId: charge.caseId },
  });
}

export async function finaliseDepositSettlement(
  ctx: RouteCtx,
  caseId: string,
): Promise<DepositSettlement> {
  const c = await loadCaseInOrg(ctx, caseId);
  if (c.settlement?.finalizedAt) {
    throw ApiError.conflict('Settlement already finalised');
  }

  const lease = await db.lease.findFirst({
    where: { id: c.leaseId, orgId: ctx.orgId },
    include: {
      tenants: { include: { tenant: true }, where: { isPrimary: true } },
      unit: { include: { property: true } },
    },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  if (!lease.unit?.property?.landlordId) {
    throw ApiError.conflict('Property has no landlord assigned');
  }

  const depositHeldCents = lease.depositAmountCents;
  const tenantTotal = c.charges
    .filter((ch) => ch.responsibility === 'TENANT')
    .reduce((sum, ch) => sum + ch.amountCents, 0);
  const chargesAppliedCents = Math.min(tenantTotal, depositHeldCents);
  const refundDueCents = Math.max(depositHeldCents - tenantTotal, 0);
  const balanceOwedCents = Math.max(tenantTotal - depositHeldCents, 0);

  const settlement = await db.depositSettlement.upsert({
    where: { caseId },
    create: {
      caseId,
      depositHeldCents,
      chargesAppliedCents,
      refundDueCents,
      balanceOwedCents,
    },
    update: {
      depositHeldCents,
      chargesAppliedCents,
      refundDueCents,
      balanceOwedCents,
    },
  });

  const primaryTenant = lease.tenants[0]?.tenant ?? null;
  const chargesData: SettlementChargeData[] = c.charges.map((ch) => ({
    id: ch.id,
    label: ch.label,
    amountCents: ch.amountCents,
    responsibility: ch.responsibility,
    sourceInspectionItemId: ch.sourceInspectionItemId,
  }));

  const finalisedAt = new Date();
  const pdf = await renderSettlementStatement({
    org: { name: 'Settlement' },
    lease: { id: lease.id },
    tenant: primaryTenant ? { firstName: primaryTenant.firstName, lastName: primaryTenant.lastName } : null,
    unit: lease.unit
      ? { label: lease.unit.label, propertyName: lease.unit.property.name }
      : null,
    settlement: {
      id: settlement.id,
      depositHeldCents,
      chargesAppliedCents,
      refundDueCents,
      balanceOwedCents,
      finalizedAt: finalisedAt,
    },
    charges: chargesData,
  });

  const upload = await currentUploader(
    `settlements/${ctx.orgId}/${settlement.id}.pdf`,
    pdf,
    'application/pdf',
  );

  const stamped = await db.depositSettlement.update({
    where: { id: settlement.id },
    data: {
      statementKey: upload.url,
      finalizedAt: finalisedAt,
    },
  });

  await db.offboardingCase.update({
    where: { id: caseId },
    data: { status: 'SETTLING' },
  });

  if (refundDueCents > 0) {
    await writeLedgerEntry(ctx, {
      landlordId: lease.unit.property.landlordId,
      type: 'DEPOSIT_OUT',
      amountCents: -refundDueCents,
      tenantId: primaryTenant?.id ?? null,
      leaseId: lease.id,
      sourceType: 'DepositSettlement',
      sourceId: stamped.id,
      note: `Deposit refund — lease ${lease.id}`,
    });
  }

  await writeAudit(ctx, {
    entityType: 'DepositSettlement',
    entityId: stamped.id,
    action: 'finalised',
    payload: {
      caseId,
      depositHeldCents,
      chargesAppliedCents,
      refundDueCents,
      balanceOwedCents,
    },
  });

  return stamped;
}

export async function getTenantOffboardingSummary(userId: string, leaseId: string) {
  const tenant = await db.tenant.findFirst({ where: { userId }, select: { id: true, orgId: true } });
  if (!tenant) return null;
  const link = await db.leaseTenant.findFirst({
    where: { tenantId: tenant.id, leaseId },
    select: { leaseId: true },
  });
  if (!link) return null;

  const c = await db.offboardingCase.findFirst({
    where: { leaseId, orgId: tenant.orgId },
    include: { settlement: true },
  });
  if (!c?.settlement?.finalizedAt) return null;

  return {
    caseId: c.id,
    depositHeldCents: c.settlement.depositHeldCents,
    chargesAppliedCents: c.settlement.chargesAppliedCents,
    refundDueCents: c.settlement.refundDueCents,
    balanceOwedCents: c.settlement.balanceOwedCents,
    statementKey: c.settlement.statementKey,
    finalizedAt: c.settlement.finalizedAt,
  };
}

export async function listTenantInspections(userId: string) {
  const tenant = await db.tenant.findFirst({ where: { userId }, select: { id: true, orgId: true } });
  if (!tenant) return [];
  const links = await db.leaseTenant.findMany({
    where: { tenantId: tenant.id },
    select: { leaseId: true },
  });
  const leaseIds = links.map((l) => l.leaseId);
  if (leaseIds.length === 0) return [];
  return db.inspection.findMany({
    where: { leaseId: { in: leaseIds }, orgId: tenant.orgId },
    orderBy: { scheduledAt: 'desc' },
  });
}

export async function getTenantInspection(userId: string, inspectionId: string) {
  const tenant = await db.tenant.findFirst({ where: { userId }, select: { id: true, orgId: true } });
  if (!tenant) return null;
  const inspection = await db.inspection.findFirst({
    where: { id: inspectionId, orgId: tenant.orgId },
    include: {
      areas: { orderBy: { orderIndex: 'asc' }, include: { items: { include: { photos: true } } } },
      signatures: { orderBy: { signedAt: 'asc' } },
    },
  });
  if (!inspection) return null;
  const link = await db.leaseTenant.findFirst({
    where: { tenantId: tenant.id, leaseId: inspection.leaseId },
    select: { leaseId: true },
  });
  if (!link) return null;
  return inspection;
}

export async function listTenantSignedInspectionsForLease(userId: string, leaseId: string) {
  const tenant = await db.tenant.findFirst({ where: { userId }, select: { id: true, orgId: true } });
  if (!tenant) return [];
  const link = await db.leaseTenant.findFirst({
    where: { tenantId: tenant.id, leaseId },
    select: { leaseId: true },
  });
  if (!link) return [];
  return db.inspection.findMany({
    where: {
      leaseId,
      orgId: tenant.orgId,
      status: 'SIGNED_OFF',
      type: { in: ['MOVE_IN', 'MOVE_OUT'] },
      reportKey: { not: null },
    },
    orderBy: { signedOffAt: 'desc' },
  });
}

export async function closeOffboardingCase(
  ctx: RouteCtx,
  caseId: string,
): Promise<OffboardingCase> {
  const c = await loadCaseInOrg(ctx, caseId);
  if (!c.settlement?.finalizedAt) {
    throw ApiError.conflict('Settlement must be finalised before closing the case');
  }
  const lease = await loadLeaseInOrg(ctx, c.leaseId);
  if (lease.state !== 'TERMINATED') {
    throw ApiError.conflict('Lease must be TERMINATED before closing the case');
  }

  const updated = await db.offboardingCase.update({
    where: { id: caseId },
    data: { status: 'CLOSED', closedAt: new Date() },
  });

  await writeAudit(ctx, {
    entityType: 'OffboardingCase',
    entityId: caseId,
    action: 'closed',
  });

  return updated;
}
