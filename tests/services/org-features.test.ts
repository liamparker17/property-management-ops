import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';

type FeatureRow = {
  id: string;
  key: string;
  enabled: boolean;
  config: unknown;
  updatedAt: Date;
};

type AuditCreateArgs = { data: Record<string, unknown> };

let db: any;
let assertFeature: (
  ctx: { orgId: string; userId: string; role: string },
  key: string,
) => Promise<void>;
let getOrgFeatures: (orgId: string) => Promise<Record<string, boolean>>;
let setOrgFeature: (
  ctx: { orgId: string; userId: string; role: string },
  key: string,
  enabled: boolean,
  config?: unknown,
) => Promise<FeatureRow>;

const featureRows = new Map<string, FeatureRow>();
const auditCreateCalls: AuditCreateArgs[] = [];

let findManyImpl: (args: any) => Promise<Array<{ key: string; enabled: boolean }>>;
let findUniqueImpl: (args: any) => Promise<FeatureRow | null>;
let upsertImpl: (args: any) => Promise<FeatureRow>;
let auditCreateImpl: (args: AuditCreateArgs) => Promise<unknown>;
let originalFindMany: any;
let originalFindUnique: any;
let originalUpsert: any;
let originalAuditCreate: any;

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalFindMany = db.orgFeature.findMany;
  originalFindUnique = db.orgFeature.findUnique;
  originalUpsert = db.orgFeature.upsert;
  originalAuditCreate = db.auditLog.create;

  db.orgFeature.findMany = async (args: any) => findManyImpl(args);
  db.orgFeature.findUnique = async (args: any) => findUniqueImpl(args);
  db.orgFeature.upsert = async (args: any) => upsertImpl(args);
  db.auditLog.create = async (args: AuditCreateArgs) => auditCreateImpl(args);

  const orgFeaturesModule = (await import('@/lib/services/org-features')) as any;
  const orgFeatures = orgFeaturesModule.default ?? orgFeaturesModule;
  ({ assertFeature, getOrgFeatures, setOrgFeature } = orgFeatures);
});

after(async () => {
  db.orgFeature.findMany = originalFindMany;
  db.orgFeature.findUnique = originalFindUnique;
  db.orgFeature.upsert = originalUpsert;
  db.auditLog.create = originalAuditCreate;
  await db.$disconnect();
});

beforeEach(() => {
  featureRows.clear();
  auditCreateCalls.length = 0;

  findManyImpl = async ({ where }) =>
    [...featureRows.entries()]
      .filter(([mapKey]) => mapKey.startsWith(`${where.orgId}:`))
      .map(([, row]) => ({ key: row.key, enabled: row.enabled }));

  findUniqueImpl = async ({ where }) =>
    featureRows.get(`${where.orgId_key.orgId}:${where.orgId_key.key}`) ?? null;

  upsertImpl = async ({ where, update, create }) => {
    const mapKey = `${where.orgId_key.orgId}:${where.orgId_key.key}`;
    const existing = featureRows.get(mapKey);
    const next: FeatureRow = {
      id: existing?.id ?? mapKey,
      key: where.orgId_key.key,
      enabled: update.enabled as boolean,
      config:
        update.config !== undefined ? update.config : existing?.config ?? (create.config ?? null),
      updatedAt: new Date('2026-04-23T10:00:00.000Z'),
    };

    featureRows.set(mapKey, next);
    return next;
  };

  auditCreateImpl = async (args: AuditCreateArgs) => {
    auditCreateCalls.push(args);
    return { id: 'audit-1', ...args.data };
  };
});

const ctx = {
  orgId: 'org-1',
  userId: 'user-1',
  role: 'ADMIN',
} as const;

describe('org-features service', () => {
  it('returns every flag with missing entries defaulted to false', async () => {
    featureRows.set('org-1:UTILITIES_BILLING', {
      id: 'org-1:UTILITIES_BILLING',
      key: 'UTILITIES_BILLING',
      enabled: true,
      config: null,
      updatedAt: new Date('2026-04-23T10:00:00.000Z'),
    });

    const features = await getOrgFeatures('org-1');

    assert.equal(features.UTILITIES_BILLING, true);
    assert.equal(features.TRUST_ACCOUNTING, false);
    assert.equal(features.AREA_NOTICES, false);
    assert.equal(features.LANDLORD_APPROVALS, false);
    assert.equal(features.USAGE_ALERTS, false);
    assert.equal(features.PAYMENT_ALERTS, false);
    assert.equal(features.ANNUAL_PACKS, false);
  });

  it('upserts a flag and writes an audit row', async () => {
    featureRows.set('org-1:UTILITIES_BILLING', {
      id: 'org-1:UTILITIES_BILLING',
      key: 'UTILITIES_BILLING',
      enabled: false,
      config: { threshold: 1 },
      updatedAt: new Date('2026-04-23T09:00:00.000Z'),
    });

    const feature = await setOrgFeature(ctx, 'UTILITIES_BILLING', true, { threshold: 2 });

    assert.equal(feature.enabled, true);
    assert.deepEqual(feature.config, { threshold: 2 });
    assert.equal(auditCreateCalls.length, 1);
    assert.deepEqual(auditCreateCalls[0]?.data, {
      orgId: 'org-1',
      actorUserId: 'user-1',
      entityType: 'OrgFeature',
      entityId: 'UTILITIES_BILLING',
      action: 'toggle',
      diff: {
        before: { enabled: false, config: { threshold: 1 } },
        after: { enabled: true, config: { threshold: 2 } },
      },
      payload: {
        key: 'UTILITIES_BILLING',
        enabled: true,
        config: { threshold: 2 },
      },
    });
  });

  it('throws when a feature is disabled', async () => {
    await assert.rejects(assertFeature(ctx, 'TRUST_ACCOUNTING'), {
      code: 'FORBIDDEN',
      status: 403,
    });
  });
});
