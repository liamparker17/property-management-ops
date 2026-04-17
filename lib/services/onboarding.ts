import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { LeaseState, Role } from '@prisma/client';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { sendTenantInvite } from '@/lib/email';
import { sendTenantInviteSms } from '@/lib/sms';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { onboardTenantSchema } from '@/lib/zod/onboarding';

function generateTempPassword() {
  return randomBytes(9).toString('base64url');
}

export async function onboardTenant(
  ctx: RouteCtx,
  input: z.infer<typeof onboardTenantSchema>,
  meta: { appUrl?: string | null } = {},
) {
  const unit = await db.unit.findFirst({
    where: { id: input.unitId, property: { orgId: ctx.orgId } },
    select: { id: true },
  });
  if (!unit) throw ApiError.notFound('Unit not found');

  const org = await db.org.findUnique({ where: { id: ctx.orgId }, select: { name: true } });

  const existingUser = await db.user.findUnique({ where: { email: input.email } });
  if (existingUser && input.sendInvite) {
    throw ApiError.conflict('A user with this email already exists');
  }

  const overlapping = await db.lease.findFirst({
    where: {
      unitId: input.unitId,
      state: { in: [LeaseState.ACTIVE, LeaseState.RENEWED] },
      startDate: { lte: new Date(input.endDate) },
      endDate: { gte: new Date(input.startDate) },
    },
    select: { id: true },
  });
  if (overlapping) throw ApiError.conflict('Unit has an overlapping lease for these dates');

  const tempPassword = input.sendInvite ? generateTempPassword() : null;
  const passwordHash = tempPassword ? await bcrypt.hash(tempPassword, 10) : null;

  const result = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        orgId: ctx.orgId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        idNumber: input.idNumber ?? null,
        notes: input.tenantNotes ?? null,
      },
    });

    if (input.sendInvite && passwordHash) {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: `${input.firstName} ${input.lastName}`.trim(),
          role: Role.TENANT,
          orgId: ctx.orgId,
          passwordHash,
        },
      });
      await tx.tenant.update({ where: { id: tenant.id }, data: { userId: user.id } });
    }

    const lease = await tx.lease.create({
      data: {
        orgId: ctx.orgId,
        unitId: input.unitId,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        rentAmountCents: input.rentAmountCents,
        depositAmountCents: input.depositAmountCents,
        heldInTrustAccount: input.heldInTrustAccount,
        paymentDueDay: input.paymentDueDay,
        notes: input.leaseNotes ?? null,
        state: LeaseState.DRAFT,
        tenants: {
          create: [{ tenantId: tenant.id, isPrimary: true }],
        },
      },
    });

    return { tenant, lease };
  });

  const appUrl = meta.appUrl ?? process.env.APP_URL ?? 'http://localhost:3000';
  const tenantName = `${input.firstName} ${input.lastName}`.trim();
  const orgName = org?.name ?? 'Your landlord';

  let emailSent = false;
  let emailError: string | undefined;
  if (input.sendInvite && tempPassword) {
    const send = await sendTenantInvite({
      to: input.email,
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
  if (input.sendInvite && input.sendSmsInvite && tempPassword) {
    if (!input.phone) {
      smsError = 'No phone number provided';
    } else {
      const send = await sendTenantInviteSms({
        to: input.phone,
        tenantName,
        orgName,
        tempPassword,
        appUrl,
      });
      smsSent = send.sent;
      smsError = send.reason;
    }
  }

  return {
    tenantId: result.tenant.id,
    leaseId: result.lease.id,
    email: input.email,
    tempPassword,
    emailSent,
    emailError,
    smsSent,
    smsError,
  };
}
