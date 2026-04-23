import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { ApplicationDecision, ApplicationStage, LeaseState, Role } from '@prisma/client';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { sendTenantInvite } from '@/lib/email';
import { sendTenantInviteSms } from '@/lib/sms';
import { writeAudit } from '@/lib/services/audit';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { onboardTenantSchema } from '@/lib/zod/onboarding';

function generateTempPassword() {
  return randomBytes(9).toString('base64url');
}

type OnboardInput = z.infer<typeof onboardTenantSchema>;

type ResolvedOnboardInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  tenantNotes: string | null;
  unitId: string;
  startDate: string;
  endDate: string;
  rentAmountCents: number;
  depositAmountCents: number;
  heldInTrustAccount: boolean;
  paymentDueDay: number;
  leaseNotes: string | null;
  sendInvite: boolean;
  sendSmsInvite: boolean;
  fromApplicationId?: string;
};

type ApplicationSeed = {
  id: string;
  stage: ApplicationStage;
  unitId: string | null;
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    idNumber: string | null;
  };
};

function derivePaymentDueDay(date: string) {
  return Number(date.slice(8, 10));
}

async function getApplicationSeed(ctx: RouteCtx, applicationId: string) {
  const application = await db.application.findFirst({
    where: { id: applicationId, orgId: ctx.orgId },
    select: {
      id: true,
      stage: true,
      unitId: true,
      applicant: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          idNumber: true,
        },
      },
    },
  });

  if (!application) {
    throw ApiError.notFound('Application not found');
  }

  return application as ApplicationSeed;
}

function requireField<K extends keyof ResolvedOnboardInput>(
  field: K,
  value: ResolvedOnboardInput[K] | undefined,
): ResolvedOnboardInput[K] {
  if (value === undefined || value === null || value === '') {
    throw ApiError.validation({ [field]: 'Required' });
  }

  return value;
}

async function resolveOnboardingInput(ctx: RouteCtx, input: OnboardInput): Promise<ResolvedOnboardInput> {
  const application = input.fromApplicationId
    ? await getApplicationSeed(ctx, input.fromApplicationId)
    : null;

  return {
    firstName: requireField('firstName', input.firstName ?? application?.applicant.firstName),
    lastName: requireField('lastName', input.lastName ?? application?.applicant.lastName),
    email: requireField('email', input.email ?? application?.applicant.email),
    phone: input.phone ?? application?.applicant.phone ?? null,
    idNumber: input.idNumber ?? application?.applicant.idNumber ?? null,
    tenantNotes: input.tenantNotes ?? null,
    unitId: requireField('unitId', input.unitId ?? application?.unitId ?? undefined),
    startDate: input.startDate,
    endDate: input.endDate,
    rentAmountCents: input.rentAmountCents,
    depositAmountCents: input.depositAmountCents,
    heldInTrustAccount: input.heldInTrustAccount,
    paymentDueDay: input.paymentDueDay ?? derivePaymentDueDay(input.startDate),
    leaseNotes: input.leaseNotes ?? null,
    sendInvite: input.sendInvite,
    sendSmsInvite: input.sendSmsInvite,
    fromApplicationId: input.fromApplicationId,
  };
}

export async function onboardTenant(
  ctx: RouteCtx,
  input: OnboardInput,
  meta: { appUrl?: string | null } = {},
) {
  const resolved = await resolveOnboardingInput(ctx, input);

  const unit = await db.unit.findFirst({
    where: { id: resolved.unitId, property: { orgId: ctx.orgId } },
    select: { id: true },
  });
  if (!unit) throw ApiError.notFound('Unit not found');

  const org = await db.org.findUnique({ where: { id: ctx.orgId }, select: { name: true } });

  const existingUser = await db.user.findUnique({ where: { email: resolved.email } });
  if (existingUser && resolved.sendInvite) {
    throw ApiError.conflict('A user with this email already exists');
  }

  const overlapping = await db.lease.findFirst({
    where: {
      unitId: resolved.unitId,
      state: { in: [LeaseState.ACTIVE, LeaseState.RENEWED] },
      startDate: { lte: new Date(resolved.endDate) },
      endDate: { gte: new Date(resolved.startDate) },
    },
    select: { id: true },
  });
  if (overlapping) throw ApiError.conflict('Unit has an overlapping lease for these dates');

  const tempPassword = resolved.sendInvite ? generateTempPassword() : null;
  const passwordHash = tempPassword ? await bcrypt.hash(tempPassword, 10) : null;

  const result = await db.$transaction(async (tx) => {
    if (resolved.fromApplicationId) {
      const application = await tx.application.findFirst({
        where: { id: resolved.fromApplicationId, orgId: ctx.orgId },
        select: { id: true, stage: true, convertedTenantId: true },
      });

      if (!application) {
        throw ApiError.notFound('Application not found');
      }
      if (application.stage !== ApplicationStage.APPROVED) {
        throw ApiError.conflict('Only approved applications can be converted');
      }
      if (application.convertedTenantId) {
        throw ApiError.conflict('Application has already been converted');
      }
    }

    const tenant = await tx.tenant.create({
      data: {
        orgId: ctx.orgId,
        firstName: resolved.firstName,
        lastName: resolved.lastName,
        email: resolved.email,
        phone: resolved.phone,
        idNumber: resolved.idNumber,
        notes: resolved.tenantNotes,
      },
    });

    let userId: string | null = null;
    if (resolved.sendInvite && passwordHash) {
      const user = await tx.user.create({
        data: {
          email: resolved.email,
          name: `${resolved.firstName} ${resolved.lastName}`.trim(),
          role: Role.TENANT,
          orgId: ctx.orgId,
          passwordHash,
        },
      });
      await tx.tenant.update({ where: { id: tenant.id }, data: { userId: user.id } });
      userId = user.id;
    }

    const lease = await tx.lease.create({
      data: {
        orgId: ctx.orgId,
        unitId: resolved.unitId,
        startDate: new Date(resolved.startDate),
        endDate: new Date(resolved.endDate),
        rentAmountCents: resolved.rentAmountCents,
        depositAmountCents: resolved.depositAmountCents,
        heldInTrustAccount: resolved.heldInTrustAccount,
        paymentDueDay: resolved.paymentDueDay,
        notes: resolved.leaseNotes,
        state: LeaseState.DRAFT,
        tenants: {
          create: [{ tenantId: tenant.id, isPrimary: true }],
        },
      },
    });

    if (resolved.fromApplicationId) {
      await tx.application.update({
        where: { id: resolved.fromApplicationId },
        data: {
          convertedTenantId: tenant.id,
          convertedLeaseId: lease.id,
          stage: ApplicationStage.CONVERTED,
          decision: ApplicationDecision.APPROVED,
        },
      });
    }

    return { tenant, lease, userId };
  });

  const appUrl = meta.appUrl ?? process.env.APP_URL ?? 'http://localhost:3000';
  const tenantName = `${resolved.firstName} ${resolved.lastName}`.trim();
  const orgName = org?.name ?? 'Your landlord';

  let emailSent = false;
  let emailError: string | undefined;
  if (resolved.sendInvite && tempPassword) {
    const send = await sendTenantInvite({
      to: resolved.email,
      tenantName,
      orgName,
      tempPassword,
      appUrl,
    });
    emailSent = send.sent;
    emailError = send.reason;
  }

  let smsSent = false;
  let smsError: string | undefined;
  if (resolved.sendInvite && resolved.sendSmsInvite && tempPassword) {
    if (!resolved.phone) {
      smsError = 'No phone number provided';
    } else {
      const send = await sendTenantInviteSms({
        to: resolved.phone,
        tenantName,
        orgName,
        tempPassword,
        appUrl,
      });
      smsSent = send.sent;
      smsError = send.reason;
    }
  }

  await writeAudit(ctx, {
    entityType: 'Tenant',
    entityId: result.tenant.id,
    action: 'onboarded',
    payload: { fromApplicationId: resolved.fromApplicationId ?? null },
  });

  await writeAudit(ctx, {
    entityType: 'Lease',
    entityId: result.lease.id,
    action: 'created',
    payload: {
      tenantId: result.tenant.id,
      fromApplicationId: resolved.fromApplicationId ?? null,
    },
  });

  if (result.userId) {
    await writeAudit(ctx, {
      entityType: 'User',
      entityId: result.userId,
      action: 'created-tenant-portal-user',
      payload: { tenantId: result.tenant.id },
    });
  }

  if (resolved.fromApplicationId) {
    await writeAudit(ctx, {
      entityType: 'Application',
      entityId: resolved.fromApplicationId,
      action: 'converted',
      payload: {
        tenantId: result.tenant.id,
        leaseId: result.lease.id,
      },
    });
  }

  return {
    tenantId: result.tenant.id,
    leaseId: result.lease.id,
    email: resolved.email,
    tempPassword,
    emailSent,
    emailError,
    smsSent,
    smsError,
  };
}
