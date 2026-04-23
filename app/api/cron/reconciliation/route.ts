import { NextResponse } from 'next/server';
import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

import { db } from '@/lib/db';
import { toErrorResponse } from '@/lib/errors';
import { runTrustReconciliation } from '@/lib/services/reconciliations';

// SAST (UTC+2): 06:00/18:00 SAST → 04:00/16:00 UTC cron invocation.
export async function GET() {
  try {
    const connected = await db.orgIntegration.findMany({
      where: {
        provider: IntegrationProvider.QUICKBOOKS,
        status: IntegrationStatus.CONNECTED,
      },
      select: { orgId: true },
    });

    const clientId = process.env.QBO_CLIENT_ID?.trim();
    if (!clientId && connected.length === 0) {
      console.warn('[cron/reconciliation] QBO_CLIENT_ID unset and no org connected; noop');
      return new NextResponse(null, { status: 204 });
    }

    if (connected.length === 0) {
      return NextResponse.json({ data: { ok: true, ran: 0 } });
    }

    const now = new Date();
    // SAST day boundary: yesterday 00:00 SAST → today 00:00 SAST = yesterday 22:00 UTC → today 22:00 UTC.
    const todayMidnightSastUtc = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      -2,
      0,
      0,
      0,
    ));
    const yesterdayMidnightSastUtc = new Date(todayMidnightSastUtc.getTime() - 24 * 60 * 60 * 1000);

    let ran = 0;
    for (const row of connected) {
      await runTrustReconciliation(
        { orgId: row.orgId, userId: 'cron', role: 'ADMIN' },
        { start: yesterdayMidnightSastUtc, end: todayMidnightSastUtc },
      );
      ran += 1;
    }
    return NextResponse.json({ data: { ok: true, ran } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
