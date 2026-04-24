import { NextResponse } from 'next/server';

import { dispatchPending } from '@/lib/services/notifications';

function authorized(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return true;
  return req.headers.get('x-cron-secret') === expected || req.headers.get('authorization') === `Bearer ${expected}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await dispatchPending();
  return NextResponse.json({ data });
}
