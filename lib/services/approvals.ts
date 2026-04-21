import type { ApprovalKind, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { decideApprovalSchema } from '@/lib/zod/approvals';

export type RequestApprovalInput = {
  kind: ApprovalKind;
  landlordId: string;
  propertyId?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  payload: Prisma.InputJsonValue;
  reason?: string;
};

export async function requestApproval(ctx: RouteCtx, input: RequestApprovalInput) {
  const landlord = await db.landlord.findFirst({
    where: { id: input.landlordId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!landlord) throw ApiError.validation({ landlordId: 'Landlord not found in this workspace' });

  return db.approval.create({
    data: {
      orgId: ctx.orgId,
      landlordId: input.landlordId,
      propertyId: input.propertyId ?? null,
      kind: input.kind,
      subjectType: input.subjectType ?? null,
      subjectId: input.subjectId ?? null,
      payload: input.payload,
      reason: input.reason ?? null,
      requestedById: ctx.userId,
    },
  });
}

export async function listPendingForLandlord(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { landlordId: true },
  });
  if (!user?.landlordId) return [];
  return db.approval.findMany({
    where: { landlordId: user.landlordId, state: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      kind: true,
      reason: true,
      payload: true,
      createdAt: true,
      propertyId: true,
    },
  });
}

export async function listApprovalsForOrg(ctx: RouteCtx, opts: { state?: 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' } = {}) {
  return db.approval.findMany({
    where: {
      orgId: ctx.orgId,
      ...(opts.state ? { state: opts.state } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { landlord: { select: { id: true, name: true } } },
  });
}

export async function decideApproval(
  userId: string,
  approvalId: string,
  input: z.infer<typeof decideApprovalSchema>,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { landlordId: true },
  });
  if (!user?.landlordId) throw ApiError.forbidden('Only landlords can decide approvals');

  const approval = await db.approval.findFirst({
    where: { id: approvalId, landlordId: user.landlordId },
  });
  if (!approval) throw ApiError.notFound('Approval not found');
  if (approval.state !== 'PENDING') throw ApiError.validation({ state: 'Approval already decided' });

  return db.approval.update({
    where: { id: approvalId },
    data: {
      state: input.decision,
      decisionNote: input.decisionNote ?? null,
      decidedById: userId,
      decidedAt: new Date(),
    },
  });
}

export async function cancelApproval(ctx: RouteCtx, approvalId: string) {
  const approval = await db.approval.findFirst({
    where: { id: approvalId, orgId: ctx.orgId, state: 'PENDING' },
  });
  if (!approval) throw ApiError.notFound('Pending approval not found');
  return db.approval.update({
    where: { id: approvalId },
    data: { state: 'CANCELLED', decidedAt: new Date() },
  });
}
