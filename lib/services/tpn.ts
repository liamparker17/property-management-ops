import { ApplicationStage, Prisma, TpnCheckStatus } from '@prisma/client';
import type { z } from 'zod';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import {
  type TpnApplicantPayload,
  tpnAdapter,
} from '@/lib/integrations/tpn/adapter';
import { writeAudit } from '@/lib/services/audit';
import type { captureTpnConsentSchema, waiveTpnCheckSchema } from '@/lib/zod/tpn';

type CaptureConsentInput = z.infer<typeof captureTpnConsentSchema>;
type WaiveInput = z.infer<typeof waiveTpnCheckSchema>;

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;

  const serialized = JSON.stringify(value);
  if (serialized === undefined) return Prisma.JsonNull;
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

async function writeSystemAudit(
  orgId: string,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    diff?: unknown;
    payload?: unknown;
  },
) {
  const auditLog = (db as unknown as {
    auditLog?: {
      create(args: { data: Record<string, unknown> }): Promise<unknown>;
    };
  }).auditLog;

  if (!auditLog?.create) {
    console.error('[tpn] AuditLog delegate unavailable; skipping system audit', {
      orgId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
    });
    return;
  }

  try {
    await auditLog.create({
      data: {
        orgId,
        actorUserId: null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        ...(input.diff !== undefined ? { diff: toJsonValue(input.diff) } : {}),
        ...(input.payload !== undefined ? { payload: toJsonValue(input.payload) } : {}),
      },
    });
  } catch (error) {
    console.error('[tpn] Failed to write system audit log', {
      orgId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      error,
    });
  }
}

async function getApplicationForOrg(ctx: RouteCtx, id: string) {
  const application = await db.application.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      applicant: true,
      property: true,
      unit: true,
      tpnCheck: true,
    },
  });

  if (!application) throw ApiError.notFound('Application not found');
  return application;
}

async function getApplicationById(id: string) {
  const application = await db.application.findUnique({
    where: { id },
    include: {
      applicant: true,
      property: true,
      unit: true,
      tpnCheck: true,
    },
  });

  if (!application) throw ApiError.notFound('Application not found');
  return application;
}

function assertTpnLifecycleStage(stage: ApplicationStage, action: 'request' | 'waive') {
  if (stage === ApplicationStage.DRAFT) {
    throw ApiError.conflict(
      action === 'request'
        ? 'Submit the application before requesting TPN screening'
        : 'Submit the application before waiving TPN screening',
    );
  }

  const blockedStages: ApplicationStage[] = [
    ApplicationStage.APPROVED,
    ApplicationStage.CONVERTED,
    ApplicationStage.DECLINED,
    ApplicationStage.WITHDRAWN,
  ];
  if (blockedStages.includes(stage)) {
    throw ApiError.conflict(`Cannot ${action} TPN screening for an application in ${stage} stage`);
  }
}

function buildApplicantPayload(application: Awaited<ReturnType<typeof getApplicationForOrg>>): TpnApplicantPayload {
  return {
    applicationId: application.id,
    orgId: application.orgId,
    applicant: {
      firstName: application.applicant.firstName,
      lastName: application.applicant.lastName,
      email: application.applicant.email,
      phone: application.applicant.phone,
      idNumber: application.applicant.idNumber ?? null,
      employer: application.applicant.employer ?? null,
      grossMonthlyIncomeCents: application.applicant.grossMonthlyIncomeCents ?? null,
      netMonthlyIncomeCents: application.applicant.netMonthlyIncomeCents ?? null,
    },
    property: application.property
      ? {
          id: application.property.id,
          name: application.property.name,
          address:
            [application.property.addressLine1, application.property.addressLine2]
              .filter(Boolean)
              .join(', ') || null,
          suburb: application.property.suburb ?? null,
          city: application.property.city ?? null,
          province: application.property.province ?? null,
          postalCode: application.property.postalCode ?? null,
        }
      : null,
    unit: application.unit
      ? {
          id: application.unit.id,
          label: application.unit.label,
        }
      : null,
    requestedMoveIn: application.requestedMoveIn?.toISOString() ?? null,
  };
}

async function transitionApplicationToVetting(
  applicationId: string,
  stage: ApplicationStage,
) {
  if (stage === ApplicationStage.SUBMITTED || stage === ApplicationStage.UNDER_REVIEW) {
    await db.application.update({
      where: { id: applicationId },
      data: { stage: ApplicationStage.VETTING },
    });
  }
}

export async function captureTpnConsent(
  ctx: RouteCtx,
  applicationId: string,
  input: CaptureConsentInput,
) {
  const application = await getApplicationForOrg(ctx, applicationId);

  if (application.applicantId !== input.applicantId) {
    throw ApiError.validation({ applicantId: ['Applicant does not match this application'] });
  }

  const applicant = await db.applicant.update({
    where: { id: input.applicantId },
    data: {
      tpnConsentGiven: true,
      tpnConsentAt: new Date(input.capturedAt),
      tpnConsentCapturedById: ctx.userId,
    },
  });

  await writeAudit(ctx, {
    entityType: 'Applicant',
    entityId: applicant.id,
    action: 'captured-tpn-consent',
    payload: {
      applicationId,
      signedName: input.signedName,
      capturedAt: input.capturedAt,
    },
  });

  return applicant;
}

export async function getTpnCheck(ctx: RouteCtx, applicationId: string) {
  const application = await db.application.findFirst({
    where: { id: applicationId, orgId: ctx.orgId },
    select: {
      id: true,
      tpnCheck: true,
    },
  });

  if (!application) throw ApiError.notFound('Application not found');
  return application.tpnCheck;
}

export async function requestTpnCheck(ctx: RouteCtx, applicationId: string) {
  const application = await getApplicationForOrg(ctx, applicationId);

  assertTpnLifecycleStage(application.stage, 'request');

  if (!application.applicant.tpnConsentGiven) {
    throw ApiError.conflict('Capture applicant TPN consent before requesting screening');
  }

  if (application.tpnCheck?.status === TpnCheckStatus.REQUESTED) {
    throw ApiError.conflict('TPN screening has already been requested for this application');
  }

  if (application.tpnCheck?.status === TpnCheckStatus.RECEIVED) {
    throw ApiError.conflict('A TPN result has already been recorded for this application');
  }

  const submitResult = await tpnAdapter.submitCheck(buildApplicantPayload(application));
  const requestedAt = new Date();

  const row = await db.tpnCheck.upsert({
    where: { applicationId },
    update: {
      status: TpnCheckStatus.REQUESTED,
      requestedAt,
      receivedAt: null,
      tpnReferenceId: submitResult.referenceId ?? null,
      recommendation: null,
      summary: null,
      reportPayload: Prisma.JsonNull,
      reportBlobKey: null,
      waivedReason: null,
      waivedById: null,
    },
    create: {
      applicationId,
      status: TpnCheckStatus.REQUESTED,
      requestedAt,
      tpnReferenceId: submitResult.referenceId ?? null,
    },
  });

  await transitionApplicationToVetting(applicationId, application.stage);

  await writeAudit(ctx, {
    entityType: 'TpnCheck',
    entityId: row.id,
    action: 'requested',
    diff: {
      before: { status: application.tpnCheck?.status ?? TpnCheckStatus.NOT_STARTED },
      after: { status: row.status },
    },
    payload: {
      applicationId,
      referenceId: submitResult.referenceId ?? null,
    },
  });

  if (submitResult.mode === 'sync') {
    return recordTpnResult(applicationId, {
      ...(submitResult.referenceId ? { referenceId: submitResult.referenceId } : {}),
      rawResponse: submitResult.rawResponse,
    });
  }

  return row;
}

export async function recordTpnResult(applicationId: string, payload: unknown) {
  const application = await getApplicationById(applicationId);
  const mapped = tpnAdapter.mapResponse(payload);
  const receivedAt = new Date();

  const row = await db.tpnCheck.upsert({
    where: { applicationId },
    update: {
      status: TpnCheckStatus.RECEIVED,
      requestedAt: application.tpnCheck?.requestedAt ?? receivedAt,
      receivedAt,
      tpnReferenceId: mapped.referenceId ?? application.tpnCheck?.tpnReferenceId ?? null,
      recommendation: mapped.recommendation,
      summary: mapped.summary,
      ...(mapped.payload !== undefined ? { reportPayload: toJsonValue(mapped.payload) } : {}),
      reportBlobKey: mapped.reportBlobKey ?? application.tpnCheck?.reportBlobKey ?? null,
      waivedReason: null,
      waivedById: null,
    },
    create: {
      applicationId,
      status: TpnCheckStatus.RECEIVED,
      requestedAt: receivedAt,
      receivedAt,
      tpnReferenceId: mapped.referenceId ?? null,
      recommendation: mapped.recommendation,
      summary: mapped.summary,
      ...(mapped.payload !== undefined ? { reportPayload: toJsonValue(mapped.payload) } : {}),
      reportBlobKey: mapped.reportBlobKey ?? null,
    },
  });

  await transitionApplicationToVetting(applicationId, application.stage);

  await writeSystemAudit(application.orgId, {
    entityType: 'TpnCheck',
    entityId: row.id,
    action: 'received-result',
    diff: {
      before: { status: application.tpnCheck?.status ?? TpnCheckStatus.NOT_STARTED },
      after: {
        status: row.status,
        recommendation: row.recommendation,
      },
    },
    payload: {
      applicationId,
      referenceId: row.tpnReferenceId,
      recommendation: row.recommendation,
    },
  });

  return row;
}

export async function waiveTpnCheck(ctx: RouteCtx, applicationId: string, reason: WaiveInput['reason']) {
  const application = await getApplicationForOrg(ctx, applicationId);

  assertTpnLifecycleStage(application.stage, 'waive');

  const row = await db.tpnCheck.upsert({
    where: { applicationId },
    update: {
      status: TpnCheckStatus.WAIVED,
      requestedAt: application.tpnCheck?.requestedAt ?? new Date(),
      receivedAt: null,
      recommendation: null,
      summary: null,
      reportPayload: Prisma.JsonNull,
      reportBlobKey: null,
      waivedReason: reason,
      waivedById: ctx.userId,
    },
    create: {
      applicationId,
      status: TpnCheckStatus.WAIVED,
      requestedAt: new Date(),
      waivedReason: reason,
      waivedById: ctx.userId,
    },
  });

  await transitionApplicationToVetting(applicationId, application.stage);

  await writeAudit(ctx, {
    entityType: 'TpnCheck',
    entityId: row.id,
    action: 'waived',
    diff: {
      before: { status: application.tpnCheck?.status ?? TpnCheckStatus.NOT_STARTED },
      after: { status: row.status },
    },
    payload: {
      applicationId,
      reason,
    },
  });

  return row;
}
