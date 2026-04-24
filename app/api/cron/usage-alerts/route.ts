import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { evaluateUsageAlerts } from '@/lib/services/usage-alerts';

function authorized(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return true;
  return req.headers.get('x-cron-secret') === expected || req.headers.get('authorization') === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db.orgFeature.findMany({
    where: { key: 'USAGE_ALERTS', enabled: true },
    select: { orgId: true },
  });

  let created = 0;
  for (const row of rows) {
    const events = await evaluateUsageAlerts(row.orgId);
    created += events.length;
  }

  return NextResponse.json({ data: { created } });
}
