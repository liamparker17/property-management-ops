import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { toErrorResponse } from '@/lib/errors';
import { isDebicheckConnectedAnywhere, retryUnpaidCollection } from '@/lib/services/debicheck';

export async function GET() {
  try {
    if (!(await isDebicheckConnectedAnywhere())) {
      return NextResponse.json({ data: { ran: false, reason: 'no STITCH_DEBICHECK connected' } });
    }

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const overdue = await db.invoice.findMany({
      where: {
        status: 'DUE',
        dueDate: { lte: twoDaysAgo },
      },
      select: { id: true, orgId: true, leaseId: true },
      take: 100,
    });

    let processed = 0;
    for (const inv of overdue) {
      const mandate = await db.debiCheckMandate.findUnique({
        where: { leaseId: inv.leaseId },
      });
      if (!mandate || mandate.status !== 'ACTIVE' || mandate.orgId !== inv.orgId) continue;
      await retryUnpaidCollection(
        { orgId: inv.orgId, userId: 'cron', role: 'ADMIN' },
        mandate.id,
        inv.id,
      );
      processed += 1;
    }

    return NextResponse.json({ data: { ran: true, processed } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
