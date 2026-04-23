import { Prisma } from '@prisma/client';
import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';
import {
  featureFlagKeys,
  type FeatureFlagKey,
  type JsonConfig,
} from '@/lib/zod/org-features';

function emptyFeatureMap(): Record<FeatureFlagKey, boolean> {
  return Object.fromEntries(featureFlagKeys.map((key) => [key, false])) as Record<
    FeatureFlagKey,
    boolean
  >;
}

function toConfigInput(config: JsonConfig): Prisma.InputJsonValue {
  return config as Prisma.InputJsonValue;
}

export async function getOrgFeatures(orgId: string): Promise<Record<FeatureFlagKey, boolean>> {
  const flags = await db.orgFeature.findMany({
    where: { orgId },
    select: { key: true, enabled: true },
  });

  const state = emptyFeatureMap();
  for (const flag of flags) {
    state[flag.key as FeatureFlagKey] = flag.enabled;
  }

  return state;
}

export async function setOrgFeature(
  ctx: RouteCtx,
  key: FeatureFlagKey,
  enabled: boolean,
  config?: JsonConfig,
) {
  const where = { orgId_key: { orgId: ctx.orgId, key } };
  const previous = await db.orgFeature.findUnique({
    where,
    select: { enabled: true, config: true },
  });

  const feature = await db.orgFeature.upsert({
    where,
    update: {
      enabled,
      ...(config !== undefined ? { config: toConfigInput(config) } : {}),
    },
    create: {
      orgId: ctx.orgId,
      key,
      enabled,
      ...(config !== undefined ? { config: toConfigInput(config) } : {}),
    },
    select: {
      id: true,
      key: true,
      enabled: true,
      config: true,
      updatedAt: true,
    },
  });

  await writeAudit(ctx, {
    entityType: 'OrgFeature',
    entityId: key,
    action: 'toggle',
    diff: {
      before: previous ? { enabled: previous.enabled, config: previous.config ?? null } : null,
      after: { enabled: feature.enabled, config: feature.config ?? null },
    },
    payload: {
      key,
      enabled: feature.enabled,
      config: feature.config ?? null,
    },
  });

  return feature;
}

export async function assertFeature(ctx: RouteCtx, key: FeatureFlagKey): Promise<void> {
  const feature = await db.orgFeature.findUnique({
    where: { orgId_key: { orgId: ctx.orgId, key } },
    select: { enabled: true },
  });

  if (!feature?.enabled) {
    throw ApiError.forbidden(`Feature ${key} is not enabled for this workspace`);
  }
}
