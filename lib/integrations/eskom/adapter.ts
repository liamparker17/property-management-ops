import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';

export interface EskomEvent {
  externalEventId: string;
  areaCode: string;
  startsAt: Date;
  endsAt: Date;
  stage: number;
  note?: string;
}

function fixtureEvents(areaCode: string): EskomEvent[] {
  const base = new Date();
  return Array.from({ length: 3 }, (_, index) => {
    const startsAt = new Date(base.getTime() + (index * 12 + 6) * 3600000);
    const endsAt = new Date(startsAt.getTime() + 2 * 3600000);
    return {
      externalEventId: `${areaCode}-${startsAt.toISOString()}`,
      areaCode,
      startsAt,
      endsAt,
      stage: Math.min(index + 1, 4),
      note: 'Fixture outage imported from the EskomSePush stub adapter.',
    };
  });
}

export async function fetchAreaSchedule(ctx: RouteCtx, areaCode: string): Promise<EskomEvent[]> {
  const integration = await db.orgIntegration.findUnique({
    where: {
      orgId_provider: {
        orgId: ctx.orgId,
        provider: IntegrationProvider.ESKOM_SE_PUSH,
      },
    },
    select: { status: true, accessTokenCipher: true },
  });

  if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
    return [];
  }

  if (process.env.NODE_ENV !== 'production' || !integration.accessTokenCipher) {
    return fixtureEvents(areaCode);
  }

  // LIVE PATH - disabled until credentials & launch milestone.
  return fixtureEvents(areaCode);
}

export async function resolveAreaCode(
  _ctx: RouteCtx,
  property: { suburb?: string | null; province?: string | null; eskomAreaCode?: string | null },
): Promise<string | null> {
  void property.suburb;
  void property.province;
  return property.eskomAreaCode ?? null;
}
