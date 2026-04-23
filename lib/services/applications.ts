import { ApplicationDecision, ApplicationStage } from '@prisma/client';
import type { z } from 'zod';

import type { RouteCtx } from '@/lib/auth/with-org';
import { uploadBlob, validateFile } from '@/lib/blob';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';
import { createNotification } from '@/lib/services/notifications';
import type {
  addApplicationNoteSchema,
  applicationListQuerySchema,
  assignReviewerSchema,
  createApplicationSchema,
  updateApplicationSchema,
  withdrawApplicationSchema,
} from '@/lib/zod/application';

type ListFilters = z.infer<typeof applicationListQuerySchema>;
type CreateInput = z.infer<typeof createApplicationSchema>;
type UpdateInput = z.infer<typeof updateApplicationSchema>;

async function getApplicationRecord(ctx: RouteCtx, id: string) {
  const application = await db.application.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      applicant: true,
      property: { select: { id: true, name: true } },
      unit: {
        select: {
          id: true,
          label: true,
          property: { select: { id: true, name: true } },
        },
      },
      reviewer: { select: { id: true, name: true, email: true, role: true } },
      tpnCheck: true,
      documents: {
        orderBy: { createdAt: 'desc' },
      },
      notes: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!application) throw ApiError.notFound('Application not found');
  return application;
}

async function assertPropertyUnitScope(
  ctx: RouteCtx,
  input: { propertyId?: string | null; unitId?: string | null },
) {
  if (input.propertyId) {
    const property = await db.property.findFirst({
      where: { id: input.propertyId, orgId: ctx.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!property) throw ApiError.validation({ propertyId: 'Property not found' });
  }

  if (input.unitId) {
    const unit = await db.unit.findFirst({
      where: { id: input.unitId, orgId: ctx.orgId },
      select: { id: true, propertyId: true },
    });
    if (!unit) throw ApiError.validation({ unitId: 'Unit not found' });
    if (input.propertyId && unit.propertyId !== input.propertyId) {
      throw ApiError.validation({ unitId: 'Unit does not belong to the selected property' });
    }
  }
}

function calculateAffordabilityRatio(input: CreateInput) {
  const net = input.applicant.netMonthlyIncomeCents;
  return net && net > 0 ? null : null;
}

async function notifyApplicationSubmitted(ctx: RouteCtx, input: {
  applicationId: string;
  applicantName: string;
}) {
  const recipients = await db.user.findMany({
    where: {
      orgId: ctx.orgId,
      role: { in: ['ADMIN', 'PROPERTY_MANAGER'] },
      disabledAt: null,
    },
    select: { id: true, role: true },
  });

  await Promise.all(
    recipients.map((recipient) =>
      createNotification(ctx, {
        userId: recipient.id,
        role: recipient.role,
        type: 'APPLICATION_SUBMITTED',
        subject: 'Application submitted',
        body: `${input.applicantName} is ready for review.`,
        payload: { applicationId: input.applicationId },
        entityType: 'Application',
        entityId: input.applicationId,
      }),
    ),
  );
}

export async function listApplications(ctx: RouteCtx, filters: ListFilters = {}) {
  return db.application.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters.stage ? { stage: filters.stage } : {}),
      ...(filters.assignedReviewerId ? { assignedReviewerId: filters.assignedReviewerId } : {}),
      ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
      ...(filters.q
        ? {
            OR: [
              { applicant: { firstName: { contains: filters.q, mode: 'insensitive' } } },
              { applicant: { lastName: { contains: filters.q, mode: 'insensitive' } } },
              { applicant: { email: { contains: filters.q, mode: 'insensitive' } } },
              { applicant: { phone: { contains: filters.q, mode: 'insensitive' } } },
              { sourceChannel: { contains: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      applicant: true,
      property: { select: { id: true, name: true } },
      unit: { select: { id: true, label: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      tpnCheck: { select: { status: true, recommendation: true } },
      _count: { select: { documents: true, notes: true } },
    },
  });
}

export async function getApplication(ctx: RouteCtx, id: string) {
  return getApplicationRecord(ctx, id);
}

export async function createApplication(ctx: RouteCtx, input: CreateInput) {
  await assertPropertyUnitScope(ctx, input.application);

  const result = await db.$transaction(async (tx) => {
    const applicant = await tx.applicant.create({
      data: {
        orgId: ctx.orgId,
        firstName: input.applicant.firstName,
        lastName: input.applicant.lastName,
        email: input.applicant.email,
        phone: input.applicant.phone,
        idNumber: input.applicant.idNumber ?? null,
        employer: input.applicant.employer ?? null,
        grossMonthlyIncomeCents: input.applicant.grossMonthlyIncomeCents ?? null,
        netMonthlyIncomeCents: input.applicant.netMonthlyIncomeCents ?? null,
        tpnConsentGiven: input.consent.consentGiven,
        tpnConsentAt: new Date(input.consent.capturedAt),
        tpnConsentCapturedById: ctx.userId,
      },
    });

    const application = await tx.application.create({
      data: {
        orgId: ctx.orgId,
        applicantId: applicant.id,
        propertyId: input.application.propertyId ?? null,
        unitId: input.application.unitId ?? null,
        requestedMoveIn: input.application.requestedMoveIn
          ? new Date(input.application.requestedMoveIn)
          : null,
        affordabilityRatio: calculateAffordabilityRatio(input),
        sourceChannel: input.application.sourceChannel ?? null,
      },
    });

    let note = null;
    if (input.application.notes) {
      note = await tx.applicationNote.create({
        data: {
          applicationId: application.id,
          authorId: ctx.userId,
          body: input.application.notes,
        },
      });
    }

    return { applicant, application, note };
  });

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: result.application.id,
    action: 'created',
    payload: {
      applicantId: result.applicant.id,
      consentCapturedAt: input.consent.capturedAt,
      propertyId: result.application.propertyId,
      unitId: result.application.unitId,
    },
  });

  return result.application;
}

export async function updateApplication(ctx: RouteCtx, id: string, input: UpdateInput) {
  const existing = await db.application.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!existing) throw ApiError.notFound('Application not found');

  await assertPropertyUnitScope(ctx, input);

  const row = await db.application.update({
    where: { id },
    data: {
      ...(input.propertyId !== undefined ? { propertyId: input.propertyId } : {}),
      ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
      ...(input.requestedMoveIn !== undefined
        ? { requestedMoveIn: input.requestedMoveIn ? new Date(input.requestedMoveIn) : null }
        : {}),
      ...(input.sourceChannel !== undefined ? { sourceChannel: input.sourceChannel } : {}),
    },
  });

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: id,
    action: 'updated',
    payload: input,
  });

  return row;
}

export async function submitApplication(ctx: RouteCtx, id: string) {
  const existing = await db.application.findFirst({
    where: { id, orgId: ctx.orgId },
    select: {
      id: true,
      stage: true,
      applicant: { select: { firstName: true, lastName: true } },
    },
  });
  if (!existing) throw ApiError.notFound('Application not found');
  if (existing.stage !== ApplicationStage.DRAFT) {
    throw ApiError.conflict('Only draft applications can be submitted');
  }

  const row = await db.application.update({
    where: { id },
    data: { stage: ApplicationStage.SUBMITTED },
  });

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: id,
    action: 'submitted',
    diff: { before: { stage: existing.stage }, after: { stage: row.stage } },
  });

  await notifyApplicationSubmitted(ctx, {
    applicationId: row.id,
    applicantName: `${existing.applicant.firstName} ${existing.applicant.lastName}`.trim(),
  });

  return row;
}

export async function assignReviewer(
  ctx: RouteCtx,
  id: string,
  userId: z.infer<typeof assignReviewerSchema>['userId'],
) {
  const [application, reviewer] = await Promise.all([
    db.application.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, assignedReviewerId: true },
    }),
    db.user.findFirst({
      where: {
        id: userId,
        orgId: ctx.orgId,
        role: { in: ['ADMIN', 'PROPERTY_MANAGER'] },
      },
      select: { id: true },
    }),
  ]);

  if (!application) throw ApiError.notFound('Application not found');
  if (!reviewer) throw ApiError.validation({ userId: 'Reviewer not found' });

  const row = await db.application.update({
    where: { id },
    data: { assignedReviewerId: userId, stage: ApplicationStage.UNDER_REVIEW },
  });

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: id,
    action: 'assigned-reviewer',
    diff: {
      before: { assignedReviewerId: application.assignedReviewerId },
      after: { assignedReviewerId: userId },
    },
  });

  return row;
}

export async function addApplicationNote(
  ctx: RouteCtx,
  id: string,
  body: z.infer<typeof addApplicationNoteSchema>['body'],
) {
  const application = await db.application.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!application) throw ApiError.notFound('Application not found');

  const note = await db.applicationNote.create({
    data: {
      applicationId: id,
      authorId: ctx.userId,
      body,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: id,
    action: 'added-note',
    payload: { noteId: note.id },
  });

  return note;
}

export async function uploadApplicationDocument(ctx: RouteCtx, id: string, file: File) {
  const application = await db.application.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!application) throw ApiError.notFound('Application not found');

  try {
    validateFile(file);
  } catch (err) {
    throw ApiError.validation({ file: (err as Error).message });
  }

  const { pathname } = await uploadBlob(`orgs/${ctx.orgId}/applications/${id}/${file.name}`, file);
  const row = await db.applicationDocument.create({
    data: {
      applicationId: id,
      storageKey: pathname,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: ctx.userId,
    },
  });

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: id,
    action: 'uploaded-document',
    payload: { documentId: row.id, filename: row.filename },
  });

  return row;
}

export async function withdrawApplication(
  ctx: RouteCtx,
  id: string,
  reason: z.infer<typeof withdrawApplicationSchema>['reason'],
) {
  const existing = await db.application.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true, stage: true },
  });
  if (!existing) throw ApiError.notFound('Application not found');
  if (existing.stage === ApplicationStage.CONVERTED) {
    throw ApiError.conflict('Converted applications cannot be withdrawn');
  }

  const row = await db.application.update({
    where: { id },
    data: {
      stage: ApplicationStage.WITHDRAWN,
      decision: ApplicationDecision.DECLINED,
      decisionReason: reason,
      decidedAt: new Date(),
    },
  });

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: id,
    action: 'withdrew',
    diff: { before: { stage: existing.stage }, after: { stage: row.stage } },
    payload: { reason },
  });

  return row;
}
