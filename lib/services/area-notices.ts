import type { AreaNotice, LeaseState, NotificationChannel, Role } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { createNotification, resolveDefaultChannels } from '@/lib/services/notifications';
import { withRoleScopeFilter } from '@/lib/services/role-scope';

type AudienceQuery = {
  propertyIds?: string[];
  unitTypes?: string[];
  leaseStates?: LeaseState[];
  roles?: Role[];
};

function getAudienceQuery(notice: Pick<AreaNotice, 'audienceQuery'>): AudienceQuery {
  return (notice.audienceQuery ?? {}) as AudienceQuery;
}

export async function createNotice(
  ctx: RouteCtx,
  input: { type: AreaNotice['type']; title: string; body: string; startsAt?: string; endsAt?: string; audienceQuery: AudienceQuery },
) {
  return db.areaNotice.create({
    data: {
      orgId: ctx.orgId,
      type: input.type,
      title: input.title,
      body: input.body,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      audienceQuery: input.audienceQuery,
      createdById: ctx.userId,
    },
  });
}

export async function getNotice(ctx: RouteCtx, id: string) {
  const notice = await db.areaNotice.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      deliveries: {
        include: { user: { select: { id: true, email: true, role: true } }, notification: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      },
    },
  });
  if (!notice) throw ApiError.notFound('Notice not found');

  if (ctx.role === 'TENANT' || ctx.role === 'LANDLORD' || ctx.role === 'MANAGING_AGENT') {
    const audience = await resolveNoticeAudience(ctx, notice);
    if (!audience.some((entry) => entry.userId === (ctx.user?.id ?? ctx.userId))) {
      throw ApiError.forbidden();
    }
  }

  return notice;
}

export async function listNotices(ctx: RouteCtx, filters?: { type?: AreaNotice['type'] }) {
  const notices = await db.areaNotice.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters?.type ? { type: filters.type } : {}),
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });

  if (ctx.role === 'ADMIN' || ctx.role === 'PROPERTY_MANAGER' || ctx.role === 'FINANCE') {
    return notices;
  }

  const visible: AreaNotice[] = [];
  for (const notice of notices) {
    const audience = await resolveNoticeAudience(ctx, notice);
    if (audience.some((entry) => entry.userId === (ctx.user?.id ?? ctx.userId))) {
      visible.push(notice);
    }
  }
  return visible;
}

async function resolvePropertyIdsForCtx(ctx: RouteCtx, requested?: string[]) {
  if (!requested || requested.length === 0) return requested;

  if (ctx.role === 'ADMIN' || ctx.role === 'PROPERTY_MANAGER' || ctx.role === 'FINANCE') {
    return requested;
  }

  const rows = await db.property.findMany({
    where: withRoleScopeFilter(ctx, { id: { in: requested }, deletedAt: null }),
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function resolveNoticeAudience(
  ctx: RouteCtx,
  notice: Pick<AreaNotice, 'audienceQuery' | 'orgId'>,
): Promise<{ userId: string; channels: NotificationChannel[] }[]> {
  const audienceQuery = getAudienceQuery(notice);
  const propertyIds = await resolvePropertyIdsForCtx(ctx, audienceQuery.propertyIds);
  const userIds = new Map<string, { role: Role; channels: NotificationChannel[] }>();

  const addUser = (userId: string, role: Role) => {
    if (!userIds.has(userId)) {
      userIds.set(userId, {
        role,
        channels: resolveDefaultChannels(ctx, 'AREA_NOTICE', { userId, role }),
      });
    }
  };

  const tenantWhere = {
    userId: { not: null },
    leases: {
      some: {
        lease: {
          orgId: ctx.orgId,
          ...(propertyIds?.length ? { unit: { propertyId: { in: propertyIds } } } : {}),
          ...(audienceQuery.leaseStates?.length ? { state: { in: audienceQuery.leaseStates } } : {}),
          ...(audienceQuery.unitTypes?.length
            ? { unit: { label: { in: audienceQuery.unitTypes } } }
            : {}),
        },
      },
    },
  } as const;

  if (!audienceQuery.roles || audienceQuery.roles.includes('TENANT')) {
    const tenants = await db.tenant.findMany({
      where: tenantWhere,
      select: { userId: true },
    });
    for (const tenant of tenants) {
      if (tenant.userId) addUser(tenant.userId, 'TENANT');
    }
  }

  if ((!audienceQuery.roles || audienceQuery.roles.includes('LANDLORD')) && propertyIds?.length) {
    const landlords = await db.user.findMany({
      where: {
        orgId: ctx.orgId,
        role: 'LANDLORD',
        landlord: { properties: { some: { id: { in: propertyIds } } } },
      },
      select: { id: true },
    });
    for (const landlord of landlords) addUser(landlord.id, 'LANDLORD');
  }

  if ((!audienceQuery.roles || audienceQuery.roles.includes('MANAGING_AGENT')) && propertyIds?.length) {
    const agents = await db.user.findMany({
      where: {
        orgId: ctx.orgId,
        role: 'MANAGING_AGENT',
        managingAgent: { assignedProperties: { some: { id: { in: propertyIds } } } },
      },
      select: { id: true },
    });
    for (const agent of agents) addUser(agent.id, 'MANAGING_AGENT');
  }

  if (audienceQuery.roles?.length && !propertyIds?.length) {
    const broadcastUsers = await db.user.findMany({
      where: { orgId: ctx.orgId, role: { in: audienceQuery.roles }, disabledAt: null },
      select: { id: true, role: true },
    });
    for (const user of broadcastUsers) addUser(user.id, user.role);
  }

  return [...userIds.entries()].map(([userId, value]) => ({
    userId,
    channels: value.channels,
  }));
}

export async function dispatchNotice(ctx: RouteCtx, id: string): Promise<{ sent: number; skipped: number }> {
  const notice = await db.areaNotice.findFirst({
    where: { id, orgId: ctx.orgId },
  });
  if (!notice) throw ApiError.notFound('Notice not found');

  const audience = await resolveNoticeAudience(ctx, notice);
  let sent = 0;
  let skipped = 0;

  for (const recipient of audience) {
    for (const channel of recipient.channels) {
      const existing = await db.noticeDelivery.findUnique({
        where: {
          noticeId_userId_channel: {
            noticeId: notice.id,
            userId: recipient.userId,
            channel,
          },
        },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      const notification = await createNotification(ctx, {
        userId: recipient.userId,
        type: 'AREA_NOTICE',
        subject: notice.title,
        body: notice.body,
        payload: { noticeId: notice.id, noticeType: notice.type },
        entityType: 'AreaNotice',
        entityId: notice.id,
        channels: [channel],
      });

      await db.noticeDelivery.create({
        data: {
          noticeId: notice.id,
          userId: recipient.userId,
          notificationId: notification.id,
          channel,
          status: channel === 'IN_APP' ? 'SENT' : 'QUEUED',
          lastAttemptAt: channel === 'IN_APP' ? new Date() : null,
        },
      });
      sent += 1;
    }
  }

  return { sent, skipped };
}

export async function publishNotice(ctx: RouteCtx, id: string) {
  const notice = await db.areaNotice.update({
    where: { id },
    data: { publishedAt: new Date() },
  });
  await dispatchNotice(ctx, id);
  return notice;
}
