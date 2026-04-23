import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { toErrorResponse } from '@/lib/errors';
import {
  isPayoutsConnectedAnywhere,
  stitchPayoutsAdapter,
} from '@/lib/integrations/stitch/payouts-adapter';

// Unauthenticated; signature verified against STITCH_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  try {
    if (!(await isPayoutsConnectedAnywhere())) {
      return NextResponse.json(
        { message: 'Stitch payouts not connected for this org' },
        { status: 501 },
      );
    }
    const rawBody = await req.text();
    const sig = req.headers.get('stitch-signature');
    const event = stitchPayoutsAdapter.handlePayoutWebhook(rawBody, sig);

    // sourceId stores the payoutExternalId written by disburseToLandlord; flip status via note for audit visibility.
    const entry = await db.trustLedgerEntry.findFirst({
      where: { sourceId: event.payoutExternalId },
      select: { id: true, note: true },
    });
    if (entry) {
      await db.trustLedgerEntry.update({
        where: { id: entry.id },
        data: {
          note: `${entry.note ?? 'Disbursement'} [payout:${event.status}]`,
        },
      });
    }

    return NextResponse.json({ data: { eventId: event.id, status: event.status } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
