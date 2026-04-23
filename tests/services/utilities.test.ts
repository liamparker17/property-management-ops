import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';
process.env.INTEGRATION_SECRET_KEY ??= randomBytes(32).toString('hex');

let db: any;
let createMeter: any;
let recordMeterReading: any;
let latestReading: any;
let estimateMissingReading: any;

const meterRows = new Map<string, any>();
const readingRows: any[] = [];
const unitRows = new Map<string, any>();
const auditCalls: any[] = [];

let origMeterCreate: any;
let origMeterFindFirst: any;
let origMeterFindMany: any;
let origUnitFindFirst: any;
let origReadingCreate: any;
let origReadingFindFirst: any;
let origReadingFindMany: any;
let origAuditCreate: any;

const ctx = { orgId: 'org-1', userId: 'user-1', role: 'ADMIN' as const };

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;

  origMeterCreate = db.meter.create;
  origMeterFindFirst = db.meter.findFirst;
  origMeterFindMany = db.meter.findMany;
  origUnitFindFirst = db.unit.findFirst;
  origReadingCreate = db.meterReading.create;
  origReadingFindFirst = db.meterReading.findFirst;
  origReadingFindMany = db.meterReading.findMany;
  origAuditCreate = db.auditLog.create;

  db.unit.findFirst = async ({ where }: any) =>
    unitRows.get(where.id) && unitRows.get(where.id).orgId === where.orgId
      ? unitRows.get(where.id)
      : null;

  db.meter.create = async ({ data }: any) => {
    const row = {
      id: `meter-${meterRows.size + 1}`,
      retiredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    meterRows.set(row.id, row);
    return row;
  };
  db.meter.findFirst = async ({ where }: any) => {
    const m = meterRows.get(where.id);
    if (!m) return null;
    if (where.orgId && m.orgId !== where.orgId) return null;
    return m;
  };
  db.meter.findMany = async ({ where }: any) => {
    return [...meterRows.values()].filter((m) => m.orgId === where.orgId);
  };

  db.meterReading.create = async ({ data }: any) => {
    const dup = readingRows.find(
      (r) => r.meterId === data.meterId && r.takenAt.getTime() === data.takenAt.getTime(),
    );
    if (dup) {
      const { Prisma } = await import('@prisma/client');
      throw new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      });
    }
    const row = {
      id: `reading-${readingRows.length + 1}`,
      createdAt: new Date(),
      ...data,
    };
    readingRows.push(row);
    return row;
  };
  db.meterReading.findFirst = async ({ where, orderBy }: any) => {
    let rows = readingRows.filter((r) => r.meterId === where.meterId);
    if (where.takenAt?.lte) {
      rows = rows.filter((r) => r.takenAt.getTime() <= where.takenAt.lte.getTime());
    }
    rows.sort((a, b) =>
      orderBy?.takenAt === 'desc'
        ? b.takenAt.getTime() - a.takenAt.getTime()
        : a.takenAt.getTime() - b.takenAt.getTime(),
    );
    return rows[0] ?? null;
  };
  db.meterReading.findMany = async ({ where, orderBy }: any) => {
    let rows = readingRows.filter((r) => r.meterId === where.meterId);
    if (where.takenAt?.gte) {
      rows = rows.filter((r) => r.takenAt.getTime() >= where.takenAt.gte.getTime());
    }
    if (where.takenAt?.lte) {
      rows = rows.filter((r) => r.takenAt.getTime() <= where.takenAt.lte.getTime());
    }
    rows.sort((a, b) =>
      orderBy?.takenAt === 'desc'
        ? b.takenAt.getTime() - a.takenAt.getTime()
        : a.takenAt.getTime() - b.takenAt.getTime(),
    );
    return rows;
  };

  db.auditLog.create = async ({ data }: any) => {
    auditCalls.push(data);
    return { id: `audit-${auditCalls.length}`, ...data };
  };

  const mod = (await import('@/lib/services/utilities')) as any;
  createMeter = mod.createMeter;
  recordMeterReading = mod.recordMeterReading;
  latestReading = mod.latestReading;
  estimateMissingReading = mod.estimateMissingReading;
});

after(async () => {
  db.meter.create = origMeterCreate;
  db.meter.findFirst = origMeterFindFirst;
  db.meter.findMany = origMeterFindMany;
  db.unit.findFirst = origUnitFindFirst;
  db.meterReading.create = origReadingCreate;
  db.meterReading.findFirst = origReadingFindFirst;
  db.meterReading.findMany = origReadingFindMany;
  db.auditLog.create = origAuditCreate;
  await db.$disconnect();
});

beforeEach(() => {
  meterRows.clear();
  readingRows.length = 0;
  unitRows.clear();
  auditCalls.length = 0;
  unitRows.set('unit-1', { id: 'unit-1', orgId: 'org-1' });
});

describe('utilities service', () => {
  it('creates a meter and writes audit', async () => {
    const meter = await createMeter(ctx, {
      unitId: 'unit-1',
      type: 'WATER',
      serial: 'A-1',
      installedAt: null,
    });
    assert.equal(meter.type, 'WATER');
    assert.equal(meter.orgId, 'org-1');
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].entityType, 'Meter');
  });

  it('records a reading and returns the latest reading for a given date', async () => {
    const meter = await createMeter(ctx, { unitId: 'unit-1', type: 'ELECTRICITY' });
    await recordMeterReading(ctx, {
      meterId: meter.id,
      takenAt: '2026-02-01T00:00:00.000Z',
      readingValue: '100',
      source: 'MANUAL',
    });
    await recordMeterReading(ctx, {
      meterId: meter.id,
      takenAt: '2026-03-01T00:00:00.000Z',
      readingValue: '150',
      source: 'MANUAL',
    });

    const latest = await latestReading(ctx, meter.id, new Date('2026-03-15T00:00:00.000Z'));
    assert.ok(latest);
    assert.equal(String(latest.readingValue), '150');

    await assert.rejects(() =>
      recordMeterReading(ctx, {
        meterId: meter.id,
        takenAt: '2026-03-01T00:00:00.000Z',
        readingValue: '160',
        source: 'MANUAL',
      }),
    );
  });

  it('estimates a missing reading using the rolling average method', async () => {
    const meter = await createMeter(ctx, { unitId: 'unit-1', type: 'WATER' });
    const values = [
      ['2026-01-01T00:00:00.000Z', '100'],
      ['2026-02-01T00:00:00.000Z', '110'],
      ['2026-03-01T00:00:00.000Z', '122'],
      ['2026-04-01T00:00:00.000Z', '136'],
    ];
    for (const [takenAt, readingValue] of values) {
      await recordMeterReading(ctx, {
        meterId: meter.id,
        takenAt,
        readingValue,
        source: 'MANUAL',
      });
    }

    const est = await estimateMissingReading(ctx, meter.id, new Date('2026-05-01T00:00:00.000Z'));
    assert.equal(est.method, 'ROLLING_AVG');
    assert.ok(Number(est.value.toString()) > 136);
  });

  it('falls back to ROLLOVER when history is too short', async () => {
    const meter = await createMeter(ctx, { unitId: 'unit-1', type: 'GAS' });
    await recordMeterReading(ctx, {
      meterId: meter.id,
      takenAt: '2026-03-01T00:00:00.000Z',
      readingValue: '55',
      source: 'MANUAL',
    });

    const est = await estimateMissingReading(ctx, meter.id, new Date('2026-04-15T00:00:00.000Z'));
    assert.equal(est.method, 'ROLLOVER');
    assert.equal(Number(est.value.toString()), 55);
  });
});
