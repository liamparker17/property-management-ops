import { NextResponse } from 'next/server';
import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

import { db } from '@/lib/db';
import { syncEskomForOrg } from '@/lib/services/outages';

function authorized(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return true;
  return req.headers.get('x-cron-secret') === expected || req.headers.get('authorization') === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db.orgIntegration.findMany({
    where: { provider: IntegrationProvider.ESKOM_SE_PUSH, status: IntegrationStatus.CONNECTED },
    select: { orgId: true },
  });

  let inserted = 0;
  let merged = 0;
  for (const row of rows) {
    const result = await syncEskomForOrg(row.orgId);
    inserted += result.inserted;
    merged += result.merged;
  }

  return NextResponse.json({ data: { inserted, merged } });
}
