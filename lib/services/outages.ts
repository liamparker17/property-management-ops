import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { fetchAreaSchedule, resolveAreaCode, type EskomEvent } from '@/lib/integrations/eskom/adapter';
import { writeAudit } from '@/lib/services/audit';
import { assertCanReadProperty, withRoleScopeFilter, withTenantLeaseFilter } from '@/lib/services/role-scope';

function cronCtx(orgId: string): RouteCtx {
  return {
    orgId,
    userId: 'cron',
    role: 'ADMIN',
    user: {
      id: 'cron',
      orgId,
      role: 'ADMIN',
      landlordId: null,
      managingAgentId: null,
      smsOptIn: false,
    },
  };
}

export async function listUpcomingOutages(
  ctx: RouteCtx,
  filters?: { propertyId?: string; from?: Date; to?: Date },
) {
  const from = filters?.from ?? new Date();
  const to = filters?.to ?? new Date(from.getTime() + 7 * 86400000);

  if (ctx.role === 'TENANT') {
    return db.loadSheddingOutage.findMany({
      where: {
        orgId: ctx.orgId,
        startsAt: { lt: to },
        endsAt: { gte: from },
        property: {
          units: {
            some: {
              leases: {
                some: withTenantLeaseFilter(ctx),
              },
            },
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  const allowedProperties = withRoleScopeFilter(ctx, {
    deletedAt: null,
    ...(filters?.propertyId ? { id: filters.propertyId } : {}),
  });
  const propertyIds = await db.property.findMany({
    where: allowedProperties,
    select: { id: true },
  });

  return db.loadSheddingOutage.findMany({
    where: {
      orgId: ctx.orgId,
      startsAt: { lt: to },
      endsAt: { gte: from },
      ...(propertyIds.length > 0 ? { propertyId: { in: propertyIds.map((row) => row.id) } } : {}),
    },
    orderBy: { startsAt: 'asc' },
  });
}

export async function getOutage(ctx: RouteCtx, id: string) {
  const outage = await db.loadSheddingOutage.findFirst({
    where: { id, orgId: ctx.orgId },
  });
  if (!outage) throw ApiError.notFound('Outage not found');
  if (outage.propertyId) {
    await assertCanReadProperty(ctx, outage.propertyId);
  }
  return outage;
}

export async function createPmOutage(
  ctx: RouteCtx,
  input: { propertyId?: string; eskomAreaCode?: string; startsAt: string; endsAt: string; stage?: number; note?: string },
) {
  if (input.propertyId) {
    await assertCanReadProperty(ctx, input.propertyId);
  }

  const startsAt = new Date(input.startsAt);
  const existing = await db.loadSheddingOutage.findFirst({
    where: {
      orgId: ctx.orgId,
      source: 'PM',
      propertyId: input.propertyId ?? null,
      startsAt,
    },
  });
  if (existing) return existing;

  const outage = await db.loadSheddingOutage.create({
    data: {
      orgId: ctx.orgId,
      propertyId: input.propertyId ?? null,
      eskomAreaCode: input.eskomAreaCode ?? null,
      source: 'PM',
      startsAt,
      endsAt: new Date(input.endsAt),
      stage: input.stage ?? null,
      note: input.note ?? null,
      createdById: ctx.user?.id ?? ctx.userId,
    },
  });

  await writeAudit(ctx, {
    entityType: 'LoadSheddingOutage',
    entityId: outage.id,
    action: 'outage.pm-create',
    payload: { propertyId: outage.propertyId, startsAt: outage.startsAt.toISOString() },
  });

  return outage;
}

export async function deletePmOutage(ctx: RouteCtx, id: string) {
  const outage = await getOutage(ctx, id);
  if (outage.source !== 'PM') throw ApiError.conflict('Only PM-created outages can be deleted');
  await db.loadSheddingOutage.delete({ where: { id } });
  await writeAudit(ctx, {
    entityType: 'LoadSheddingOutage',
    entityId: id,
    action: 'outage.pm-delete',
  });
}

export async function recordEskomOutage(ctx: RouteCtx, event: EskomEvent, propertyId?: string) {
  const overlappingPm = await db.loadSheddingOutage.findFirst({
    where: {
      orgId: ctx.orgId,
      propertyId: propertyId ?? null,
      source: 'PM',
      startsAt: { lt: event.endsAt },
      endsAt: { gt: event.startsAt },
    },
  });
  if (overlappingPm) {
    return { row: overlappingPm, merged: true };
  }

  const existing = await db.loadSheddingOutage.findFirst({
    where: {
      orgId: ctx.orgId,
      propertyId: propertyId ?? null,
      externalEventId: event.externalEventId,
    },
  });

  const row = existing
    ? await db.loadSheddingOutage.update({
        where: { id: existing.id },
        data: {
          eskomAreaCode: event.areaCode,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          stage: event.stage,
          note: event.note ?? null,
        },
      })
    : await db.loadSheddingOutage.create({
        data: {
          orgId: ctx.orgId,
          propertyId: propertyId ?? null,
          eskomAreaCode: event.areaCode,
          source: 'ESKOM_SE_PUSH',
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          stage: event.stage,
          note: event.note ?? null,
          externalEventId: event.externalEventId,
        },
      });

  return { row, merged: false };
}

export async function syncEskomForOrg(orgId: string): Promise<{ inserted: number; merged: number }> {
  const integration = await db.orgIntegration.findUnique({
    where: {
      orgId_provider: {
        orgId,
        provider: IntegrationProvider.ESKOM_SE_PUSH,
      },
    },
    select: { status: true },
  });
  if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
    return { inserted: 0, merged: 0 };
  }

  const ctx = cronCtx(orgId);
  const properties = await db.property.findMany({
    where: { orgId, deletedAt: null },
    select: { id: true, suburb: true, province: true, eskomAreaCode: true },
  });

  let inserted = 0;
  let merged = 0;

  for (const property of properties) {
    const areaCode = await resolveAreaCode(ctx, property);
    if (!areaCode) continue;
    const events = await fetchAreaSchedule(ctx, areaCode);
    for (const event of events) {
      const result = await recordEskomOutage(ctx, event, property.id);
      if (result.merged) merged += 1;
      else inserted += 1;
    }
  }

  await writeAudit(ctx, {
    entityType: 'LoadSheddingOutage',
    entityId: orgId,
    action: 'outage.eskom-sync',
    payload: { inserted, merged },
  });

  return { inserted, merged };
}
