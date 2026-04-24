import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { evaluatePaymentAlerts } from '@/lib/services/payment-alerts';

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
    where: { key: 'PAYMENT_ALERTS', enabled: true },
    select: { orgId: true },
  });

  let reminded = 0;
  let overdueFlagged = 0;
  let finalNoticed = 0;
  for (const row of rows) {
    const result = await evaluatePaymentAlerts(row.orgId);
    reminded += result.reminded;
    overdueFlagged += result.overdueFlagged;
    finalNoticed += result.finalNoticed;
  }

  return NextResponse.json({ data: { reminded, overdueFlagged, finalNoticed } });
}
