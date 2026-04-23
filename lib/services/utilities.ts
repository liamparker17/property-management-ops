import { Prisma } from '@prisma/client';
import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';
import type { z } from 'zod';
import type {
  createMeterSchema,
  recordMeterReadingSchema,
  upsertUtilityTariffSchema,
  utilityTypeEnum,
} from '@/lib/zod/utilities';

type UtilityType = z.infer<typeof utilityTypeEnum>;

export type ListMetersFilters = {
  unitId?: string;
  type?: UtilityType;
  includeRetired?: boolean;
};

export async function listMeters(ctx: RouteCtx, filters: ListMetersFilters = {}) {
  return db.meter.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters.unitId ? { unitId: filters.unitId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.includeRetired ? {} : { retiredAt: null }),
    },
    orderBy: [{ unitId: 'asc' }, { type: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getMeter(ctx: RouteCtx, id: string) {
  const meter = await db.meter.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      unit: { include: { property: { select: { id: true, name: true } } } },
      readings: { orderBy: { takenAt: 'desc' }, take: 12 },
    },
  });
  if (!meter) throw ApiError.notFound('Meter not found');
  return meter;
}

export async function createMeter(ctx: RouteCtx, input: z.infer<typeof createMeterSchema>) {
  const unit = await db.unit.findFirst({
    where: { id: input.unitId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!unit) throw ApiError.notFound('Unit not found');

  const meter = await db.meter.create({
    data: {
      orgId: ctx.orgId,
      unitId: input.unitId,
      type: input.type,
      serial: input.serial ?? null,
      installedAt: input.installedAt ? new Date(input.installedAt) : null,
    },
  });

  await writeAudit(ctx, {
    entityType: 'Meter',
    entityId: meter.id,
    action: 'create',
    payload: { unitId: meter.unitId, type: meter.type, serial: meter.serial },
  });

  return meter;
}

export async function retireMeter(ctx: RouteCtx, id: string) {
  const existing = await db.meter.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true, retiredAt: true },
  });
  if (!existing) throw ApiError.notFound('Meter not found');
  if (existing.retiredAt) return existing;

  const meter = await db.meter.update({
    where: { id },
    data: { retiredAt: new Date() },
  });

  await writeAudit(ctx, {
    entityType: 'Meter',
    entityId: id,
    action: 'retire',
    diff: { before: { retiredAt: null }, after: { retiredAt: meter.retiredAt } },
  });

  return meter;
}

export async function recordMeterReading(
  ctx: RouteCtx,
  input: z.infer<typeof recordMeterReadingSchema>,
) {
  const meter = await db.meter.findFirst({
    where: { id: input.meterId, orgId: ctx.orgId },
    select: { id: true, retiredAt: true },
  });
  if (!meter) throw ApiError.notFound('Meter not found');
  if (meter.retiredAt) {
    throw ApiError.conflict('Cannot record a reading against a retired meter');
  }

  const takenAt = new Date(input.takenAt);
  try {
    const reading = await db.meterReading.create({
      data: {
        meterId: input.meterId,
        takenAt,
        readingValue: new Prisma.Decimal(input.readingValue),
        source: input.source,
        recordedById: ctx.userId,
      },
    });

    await writeAudit(ctx, {
      entityType: 'MeterReading',
      entityId: reading.id,
      action: 'create',
      payload: {
        meterId: reading.meterId,
        takenAt: reading.takenAt.toISOString(),
        source: reading.source,
      },
    });

    return reading;
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw ApiError.conflict('A reading already exists for this meter at that timestamp');
    }
    throw err;
  }
}

export async function latestReading(ctx: RouteCtx, meterId: string, asOf: Date) {
  const meter = await db.meter.findFirst({
    where: { id: meterId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!meter) throw ApiError.notFound('Meter not found');

  return db.meterReading.findFirst({
    where: { meterId, takenAt: { lte: asOf } },
    orderBy: { takenAt: 'desc' },
  });
}

function subUtcMonths(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, d.getUTCDate()));
}

export async function estimateMissingReading(
  ctx: RouteCtx,
  meterId: string,
  asOf: Date,
): Promise<{ value: Prisma.Decimal; method: 'ROLLING_AVG' | 'ROLLOVER' }> {
  const meter = await db.meter.findFirst({
    where: { id: meterId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!meter) throw ApiError.notFound('Meter not found');

  const windowStart = subUtcMonths(asOf, 4);
  const history = await db.meterReading.findMany({
    where: { meterId, takenAt: { gte: windowStart, lte: asOf } },
    orderBy: { takenAt: 'asc' },
  });

  if (history.length >= 2) {
    const deltas: Prisma.Decimal[] = [];
    for (let i = 1; i < history.length; i++) {
      const delta = new Prisma.Decimal(history[i].readingValue.toString()).minus(
        new Prisma.Decimal(history[i - 1].readingValue.toString()),
      );
      deltas.push(delta);
    }
    const recent = deltas.slice(-3);
    const sum = recent.reduce((acc, cur) => acc.plus(cur), new Prisma.Decimal(0));
    const avg = sum.dividedBy(recent.length);
    const last = new Prisma.Decimal(history[history.length - 1].readingValue.toString());
    return { value: last.plus(avg), method: 'ROLLING_AVG' };
  }

  const last = await db.meterReading.findFirst({
    where: { meterId, takenAt: { lte: asOf } },
    orderBy: { takenAt: 'desc' },
  });
  if (last) {
    return { value: new Prisma.Decimal(last.readingValue.toString()), method: 'ROLLOVER' };
  }
  return { value: new Prisma.Decimal(0), method: 'ROLLOVER' };
}

export type ListTariffsFilters = {
  propertyId?: string | null;
  type?: UtilityType;
  effectiveOn?: Date;
};

export async function listTariffs(ctx: RouteCtx, filters: ListTariffsFilters = {}) {
  return db.utilityTariff.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters.propertyId === null
        ? { propertyId: null }
        : filters.propertyId
          ? { propertyId: filters.propertyId }
          : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.effectiveOn
        ? {
            effectiveFrom: { lte: filters.effectiveOn },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: filters.effectiveOn } }],
          }
        : {}),
    },
    orderBy: [{ type: 'asc' }, { effectiveFrom: 'desc' }],
  });
}

export async function upsertTariff(
  ctx: RouteCtx,
  input: z.infer<typeof upsertUtilityTariffSchema>,
) {
  if (input.propertyId) {
    const property = await db.property.findFirst({
      where: { id: input.propertyId, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!property) throw ApiError.notFound('Property not found');
  }

  const data = {
    orgId: ctx.orgId,
    propertyId: input.propertyId ?? null,
    type: input.type,
    structure: input.structure,
    effectiveFrom: new Date(input.effectiveFrom),
    effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
    flatUnitRateCents: input.flatUnitRateCents ?? null,
    tieredJson: (input.tieredJson ?? undefined) as Prisma.InputJsonValue | undefined,
  };

  const tariff = input.id
    ? await db.utilityTariff.update({
        where: { id: input.id },
        data,
      })
    : await db.utilityTariff.create({ data });

  await writeAudit(ctx, {
    entityType: 'UtilityTariff',
    entityId: tariff.id,
    action: input.id ? 'update' : 'create',
    payload: {
      type: tariff.type,
      structure: tariff.structure,
      propertyId: tariff.propertyId,
      effectiveFrom: tariff.effectiveFrom.toISOString(),
    },
  });

  return tariff;
}
