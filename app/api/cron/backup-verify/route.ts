import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { runVerification } from '@/lib/services/backup';

function authorized(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return true;
  return req.headers.get('x-cron-secret') === expected || req.headers.get('authorization') === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgs = await db.org.findMany({ select: { id: true } });
  const summary: Array<Record<string, unknown>> = [];
  for (const org of orgs) {
    const ctx = { orgId: org.id, userId: 'cron', role: 'ADMIN' as const };
    try {
      const run = await runVerification(ctx);
      summary.push({ orgId: org.id, runId: run.id, ok: run.status === 'OK' });
    } catch (error) {
      summary.push({
        orgId: org.id,
        ok: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  }

  return NextResponse.json({ data: { orgs: summary } });
}
