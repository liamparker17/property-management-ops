import type { UtilityType } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/services/notifications';
import { monthFloor } from '@/lib/services/snapshots';

function cronCtx(orgId: string) {
  return {
    orgId,
    userId: 'cron',
    role: 'ADMIN' as const,
    user: {
      id: 'cron',
      orgId,
      role: 'ADMIN' as const,
      landlordId: null,
      managingAgentId: null,
      smsOptIn: false,
    },
  };
}

function decimalToNumber(value: { toString(): string }) {
  return Number(value.toString());
}

export async function listRules(ctx: RouteCtx) {
  return db.usageAlertRule.findMany({
    where: { orgId: ctx.orgId },
    orderBy: [{ utilityType: 'asc' }],
  });
}

export async function upsertRule(
  ctx: RouteCtx,
  input: { utilityType: UtilityType; thresholdPct: number; enabled: boolean },
) {
  return db.usageAlertRule.upsert({
    where: { orgId_utilityType: { orgId: ctx.orgId, utilityType: input.utilityType } },
    create: {
      orgId: ctx.orgId,
      utilityType: input.utilityType,
      thresholdPct: input.thresholdPct,
      enabled: input.enabled,
    },
    update: {
      thresholdPct: input.thresholdPct,
      enabled: input.enabled,
    },
  });
}

async function getThresholds(orgId: string) {
  const feature = await db.orgFeature.findUnique({
    where: { orgId_key: { orgId, key: 'USAGE_ALERTS' } },
    select: { config: true },
  });
  const config = (feature?.config ?? {}) as { warnPct?: number; urgentPct?: number };
  return { warnPct: config.warnPct ?? 50, urgentPct: config.urgentPct ?? 100 };
}

export async function evaluateUsageAlerts(orgId: string) {
  const ctx = cronCtx(orgId);
  const { warnPct, urgentPct } = await getThresholds(orgId);
  const meters = await db.meter.findMany({
    where: { orgId, retiredAt: null },
    include: {
      unit: {
        include: {
          property: { select: { name: true } },
          leases: {
            where: { state: { in: ['ACTIVE', 'RENEWED'] } },
            orderBy: { startDate: 'desc' },
            take: 1,
            include: {
              tenants: {
                where: { isPrimary: true },
                include: { tenant: { select: { userId: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      },
      readings: {
        orderBy: { takenAt: 'asc' },
      },
    },
  });

  const events = [];

  for (const meter of meters) {
    if (meter.readings.length < 5) continue;
    const activeLease = meter.unit.leases[0];
    if (!activeLease) continue;
    const current = meter.readings[meter.readings.length - 1];
    const prior = meter.readings[meter.readings.length - 2];
    const previousFour = meter.readings.slice(-5, -1);

    const observedQty = decimalToNumber(current.readingValue) - decimalToNumber(prior.readingValue);
    const priorDeltas = [
      decimalToNumber(previousFour[1].readingValue) - decimalToNumber(previousFour[0].readingValue),
      decimalToNumber(previousFour[2].readingValue) - decimalToNumber(previousFour[1].readingValue),
      decimalToNumber(previousFour[3].readingValue) - decimalToNumber(previousFour[2].readingValue),
    ];
    const baselineQty = priorDeltas.reduce((sum, value) => sum + value, 0) / priorDeltas.length;

    if (!Number.isFinite(baselineQty) || baselineQty <= 0) continue;

    const deltaPct = Math.round(((observedQty - baselineQty) / baselineQty) * 100);
    if (deltaPct < warnPct) continue;

    const periodStart = monthFloor(current.takenAt);
    const existing = await db.usageAlertEvent.findFirst({
      where: { meterId: meter.id, periodStart },
      select: { id: true },
    });
    if (existing) continue;

    const rule = await db.usageAlertRule.upsert({
      where: { orgId_utilityType: { orgId, utilityType: meter.type } },
      create: {
        orgId,
        utilityType: meter.type,
        thresholdPct: warnPct,
        enabled: true,
      },
      update: {},
    });

    const tenant = activeLease.tenants[0]?.tenant;
    const type = deltaPct >= urgentPct ? 'USAGE_ALERT_URGENT' : 'USAGE_ALERT_WARN';
    const notification = tenant?.userId
      ? await createNotification(ctx, {
          userId: tenant.userId,
          role: 'TENANT',
          type,
          subject: deltaPct >= urgentPct ? 'Urgent usage spike detected' : 'Usage spike detected',
          body: `We spotted unusual ${meter.type.toLowerCase()} usage at ${meter.unit.property.name} / ${meter.unit.label}.`,
          payload: { meterId: meter.id, deltaPct, utilityType: meter.type },
          entityType: 'Meter',
          entityId: meter.id,
        })
      : null;

    const event = await db.usageAlertEvent.create({
      data: {
        orgId,
        ruleId: rule.id,
        leaseId: activeLease.id,
        meterId: meter.id,
        notificationId: notification?.id ?? null,
        periodStart,
        observedQty,
        baselineQty,
        deltaPct,
      },
    });
    events.push(event);
  }

  return events;
}
