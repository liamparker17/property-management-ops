import {
  ApplicationDecision,
  ApplicationStage,
  TpnCheckStatus,
  TpnRecommendation,
} from '@prisma/client';
import type { z } from 'zod';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { createNotification } from '@/lib/services/notifications';
import { onboardTenant } from '@/lib/services/onboarding';
import { writeAudit } from '@/lib/services/audit';
import type { applicationDecisionSchema, convertApplicationSchema } from '@/lib/zod/application';

type DecisionInput = z.infer<typeof applicationDecisionSchema>;
type ConvertInput = z.infer<typeof convertApplicationSchema>;

async function getApplicationForDecision(ctx: RouteCtx, id: string) {
  const application = await db.application.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      applicant: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          idNumber: true,
          tpnConsentGiven: true,
        },
      },
      tpnCheck: true,
    },
  });

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  return application;
}

function assertMutableStage(stage: ApplicationStage) {
  if (stage === ApplicationStage.CONVERTED) {
    throw ApiError.conflict('Converted applications cannot be changed');
  }
  if (stage === ApplicationStage.WITHDRAWN) {
    throw ApiError.conflict('Withdrawn applications cannot be changed');
  }
}

function assertApprovalAllowed(application: Awaited<ReturnType<typeof getApplicationForDecision>>, input: DecisionInput) {
  assertMutableStage(application.stage);

  if (application.stage === ApplicationStage.APPROVED) {
    throw ApiError.conflict('Application has already been approved');
  }
  if (application.stage === ApplicationStage.DECLINED) {
    throw ApiError.conflict('Declined applications cannot be approved');
  }

  const tpnCheck = application.tpnCheck;
  if (!tpnCheck) {
    throw ApiError.conflict('TPN check is required before approval');
  }

  if (tpnCheck.status === TpnCheckStatus.WAIVED) {
    return;
  }

  if (!application.applicant.tpnConsentGiven) {
    throw ApiError.conflict('Applicant consent must be captured before approval');
  }

  if (tpnCheck.status !== TpnCheckStatus.RECEIVED) {
    throw ApiError.conflict('Approval requires a received TPN report');
  }

  switch (tpnCheck.recommendation) {
    case TpnRecommendation.PASS:
      return;
    case TpnRecommendation.CAUTION:
      if (!input.overrideReason?.trim()) {
        throw ApiError.validation(
          { overrideReason: 'Override reason is required when TPN returns CAUTION' },
          'Approval override reason required',
        );
      }
      return;
    case TpnRecommendation.DECLINE:
      throw ApiError.conflict('Applications with a declined TPN recommendation cannot be approved');
    default:
      throw ApiError.conflict('Approval requires a passing TPN recommendation');
  }
}

export async function approveApplication(ctx: RouteCtx, id: string, input: DecisionInput) {
  const application = await getApplicationForDecision(ctx, id);
  assertApprovalAllowed(application, input);

  const updated = await db.application.update({
    where: { id },
    data: {
      stage: ApplicationStage.APPROVED,
      decision: ApplicationDecision.APPROVED,
      decisionReason: input.overrideReason?.trim() || input.reason?.trim() || null,
      decidedAt: new Date(),
    },
  });

  if (input.note?.trim()) {
    await db.applicationNote.create({
      data: {
        applicationId: id,
        authorId: ctx.userId,
        body: input.note.trim(),
      },
    });
  }

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: id,
    action: 'approved',
    diff: {
      before: { stage: application.stage, decision: application.decision },
      after: { stage: updated.stage, decision: updated.decision },
    },
    payload: {
      recommendation: application.tpnCheck?.recommendation ?? null,
      tpnStatus: application.tpnCheck?.status ?? null,
      overrideReason: input.overrideReason?.trim() || null,
      note: input.note?.trim() || null,
    },
  });

  if (application.assignedReviewerId) {
    await createNotification(ctx, {
      userId: application.assignedReviewerId,
      type: 'APPLICATION_APPROVED',
      subject: `Application approved: ${application.applicant.firstName} ${application.applicant.lastName}`,
      body: input.overrideReason?.trim() || input.reason?.trim() || 'Application approved.',
      entityType: 'Application',
      entityId: id,
    });
  }

  return updated;
}

export async function declineApplication(ctx: RouteCtx, id: string, input: DecisionInput) {
  const application = await getApplicationForDecision(ctx, id);
  assertMutableStage(application.stage);

  if (application.stage === ApplicationStage.DECLINED) {
    throw ApiError.conflict('Application has already been declined');
  }
  if (application.stage === ApplicationStage.APPROVED) {
    throw ApiError.conflict('Approved applications cannot be declined');
  }

  const reason = input.reason?.trim();
  if (!reason) {
    throw ApiError.validation({ reason: 'Reason is required when declining an application' });
  }

  const updated = await db.application.update({
    where: { id },
    data: {
      stage: ApplicationStage.DECLINED,
      decision: ApplicationDecision.DECLINED,
      decisionReason: reason,
      decidedAt: new Date(),
    },
  });

  if (input.note?.trim()) {
    await db.applicationNote.create({
      data: {
        applicationId: id,
        authorId: ctx.userId,
        body: input.note.trim(),
      },
    });
  }

  await writeAudit(ctx, {
    entityType: 'Application',
    entityId: id,
    action: 'declined',
    diff: {
      before: { stage: application.stage, decision: application.decision },
      after: { stage: updated.stage, decision: updated.decision },
    },
    payload: {
      reason,
      note: input.note?.trim() || null,
    },
  });

  if (application.assignedReviewerId) {
    await createNotification(ctx, {
      userId: application.assignedReviewerId,
      type: 'APPLICATION_DECLINED',
      subject: `Application declined: ${application.applicant.firstName} ${application.applicant.lastName}`,
      body: reason,
      entityType: 'Application',
      entityId: id,
    });
  }

  return updated;
}

export async function convertApplicationToTenant(ctx: RouteCtx, id: string, input: ConvertInput) {
  const application = await getApplicationForDecision(ctx, id);

  if (application.stage !== ApplicationStage.APPROVED) {
    throw ApiError.conflict('Only approved applications can be converted');
  }
  if (!application.unitId) {
    throw ApiError.conflict('Application must be assigned to a unit before conversion');
  }
  if (application.convertedTenantId) {
    throw ApiError.conflict('Application has already been converted');
  }

  const onboardingResult = await onboardTenant(
    ctx,
    {
      fromApplicationId: id,
      startDate: input.startDate,
      endDate: input.endDate,
      rentAmountCents: input.rentAmountCents,
      depositAmountCents: input.depositAmountCents,
      heldInTrustAccount: false,
      paymentDueDay: Number(input.startDate.slice(8, 10)),
      leaseNotes: null,
      sendInvite: input.createPortalUser,
      sendSmsInvite: false,
    },
    {},
  );

  const [tenant, lease, updatedApplication] = await Promise.all([
    db.tenant.findFirst({
      where: { id: onboardingResult.tenantId, orgId: ctx.orgId },
    }),
    db.lease.findFirst({
      where: { id: onboardingResult.leaseId, orgId: ctx.orgId },
    }),
    db.application.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        applicant: true,
        tpnCheck: true,
      },
    }),
  ]);

  if (!tenant || !lease || !updatedApplication) {
    throw ApiError.internal('Conversion completed but linked records could not be loaded');
  }

  return {
    tenant,
    lease,
    application: updatedApplication,
    tempPassword: onboardingResult.tempPassword,
    emailSent: onboardingResult.emailSent,
    emailError: onboardingResult.emailError,
    smsSent: onboardingResult.smsSent,
    smsError: onboardingResult.smsError,
  };
}
