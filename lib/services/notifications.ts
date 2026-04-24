import type {
  Notification,
  NotificationChannel,
  NotificationDelivery,
  Role,
} from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { ApiError } from '@/lib/errors';
import { sendSms } from '@/lib/sms';

type CreateNotificationInput = {
  userId?: string | null;
  role?: Role | null;
  type: string;
  subject: string;
  body: string;
  payload?: unknown;
  entityType?: string | null;
  entityId?: string | null;
  channels?: NotificationChannel[];
};

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function resolveSmsRecipient(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      landlordId: true,
      managingAgentId: true,
    },
  });
  if (!user) return null;

  if (user.role === 'TENANT') {
    const tenant = await db.tenant.findFirst({
      where: { userId },
      select: { phone: true },
    });
    return tenant?.phone ?? null;
  }

  if (user.role === 'LANDLORD' && user.landlordId) {
    const landlord = await db.landlord.findUnique({
      where: { id: user.landlordId },
      select: { phone: true },
    });
    return landlord?.phone ?? null;
  }

  if (user.role === 'MANAGING_AGENT' && user.managingAgentId) {
    const agent = await db.managingAgent.findUnique({
      where: { id: user.managingAgentId },
      select: { phone: true },
    });
    return agent?.phone ?? null;
  }

  return null;
}

export function resolveDefaultChannels(
  ctx: RouteCtx,
  notificationType: string,
  recipient?: { role?: Role | null; userId?: string | null },
): NotificationChannel[] {
  void notificationType;

  const channels: NotificationChannel[] = ['IN_APP'];
  const role = recipient?.role ?? ctx.role;
  const isTenant = role === 'TENANT';

  channels.push('EMAIL');

  if (isTenant && ctx.user?.smsOptIn) {
    channels.push('SMS');
  }

  return channels;
}

export async function enqueueDeliveries(
  ctx: RouteCtx,
  notification: Notification,
  channels: NotificationChannel[],
): Promise<NotificationDelivery[]> {
  void ctx;
  const deduped = [...new Set(channels)];

  if (deduped.length === 0) return [];

  try {
    return await db.$transaction(async (tx) => {
      if (!('notificationDelivery' in tx) || !tx.notificationDelivery) {
        return [];
      }

      const deliveries: NotificationDelivery[] = [];
      for (const channel of deduped) {
        const row = await tx.notificationDelivery.create({
          data: {
            notificationId: notification.id,
            channel,
            status: channel === 'IN_APP' ? 'SENT' : 'QUEUED',
            lastAttemptAt: channel === 'IN_APP' ? new Date() : null,
          },
        });
        deliveries.push(row);
      }
      return deliveries;
    });
  } catch (err) {
    console.warn('[notifications] failed to enqueue deliveries', err);
    return [];
  }
}

export async function createNotification(ctx: RouteCtx, input: CreateNotificationInput) {
  const notification = await db.notification.create({
    data: {
      orgId: ctx.orgId,
      userId: input.userId ?? null,
      role: input.role ?? null,
      type: input.type,
      subject: input.subject,
      body: input.body,
      payload: input.payload ?? undefined,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });

  await enqueueDeliveries(
    ctx,
    notification,
    input.channels ?? resolveDefaultChannels(ctx, input.type, { role: input.role, userId: input.userId }),
  );

  return notification;
}

export async function dispatchPending(): Promise<{ sent: number; failed: number }> {
  const pending = await db.notificationDelivery.findMany({
    where: { status: 'QUEUED' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      notification: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              smsOptIn: true,
            },
          },
        },
      },
    },
    take: 100,
  });

  let sent = 0;
  let failed = 0;

  for (const delivery of pending) {
    const attemptedAt = new Date();
    try {
      if (delivery.channel === 'IN_APP') {
        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SENT', lastAttemptAt: attemptedAt },
        });
        sent += 1;
        continue;
      }

      if (!delivery.notification.userId || !delivery.notification.user) {
        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'SKIPPED',
            lastAttemptAt: attemptedAt,
            error: 'Notification has no direct user recipient',
          },
        });
        continue;
      }

      if (delivery.channel === 'EMAIL') {
        if (!delivery.notification.user.email) {
          await db.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'SKIPPED',
              lastAttemptAt: attemptedAt,
              error: 'User has no email address',
            },
          });
          continue;
        }

        const result = await sendEmail({
          to: delivery.notification.user.email,
          subject: delivery.notification.subject,
          text: delivery.notification.body,
          html: `<div style="font-family:ui-sans-serif,system-ui,sans-serif;white-space:pre-line">${escapeHtml(delivery.notification.body)}</div>`,
        });

        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: result.sent ? 'SENT' : 'FAILED',
            lastAttemptAt: attemptedAt,
            ...(result.sent ? { providerRef: `email:${delivery.notification.user.email}` } : { error: result.reason ?? 'Unknown email failure' }),
          },
        });
        if (result.sent) sent += 1;
        else failed += 1;
        continue;
      }

      const phone = await resolveSmsRecipient(delivery.notification.userId);
      if (!phone || !delivery.notification.user.smsOptIn) {
        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'SKIPPED',
            lastAttemptAt: attemptedAt,
            error: !phone ? 'User has no SMS destination' : 'User has not opted into SMS',
          },
        });
        continue;
      }

      const result = await sendSms({
        to: phone,
        text: `${delivery.notification.subject}: ${delivery.notification.body}`,
      });
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: result.sent ? 'SENT' : 'FAILED',
          lastAttemptAt: attemptedAt,
          ...(result.sent ? { providerRef: `sms:${phone}` } : { error: result.reason ?? 'Unknown SMS failure' }),
        },
      });
      if (result.sent) sent += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          lastAttemptAt: attemptedAt,
          error: err instanceof Error ? err.message : 'Unknown delivery failure',
        },
      });
    }
  }

  return { sent, failed };
}

export async function listNotificationsForUser(
  ctx: RouteCtx,
  filters?: { unreadOnly?: boolean; limit?: number },
) {
  return db.notification.findMany({
    where: {
      orgId: ctx.orgId,
      OR: [{ userId: ctx.user?.id ?? ctx.userId }, { role: ctx.role }],
      ...(filters?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit ?? 50,
    include: { deliveries: true },
  });
}

export async function markNotificationRead(ctx: RouteCtx, id: string) {
  const row = await db.notification.findFirst({
    where: {
      id,
      orgId: ctx.orgId,
      OR: [{ userId: ctx.user?.id ?? ctx.userId }, { role: ctx.role }],
    },
    select: { id: true },
  });
  if (!row) throw ApiError.forbidden();

  return db.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}
