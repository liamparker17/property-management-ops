import { NextRequest, NextResponse } from 'next/server';

import { toErrorResponse } from '@/lib/errors';
import { handleStitchWebhook, isStitchPaymentsConnectedAnywhere } from '@/lib/services/stitch-payments';

// Unauthenticated endpoint; Stitch signs the body with STITCH_WEBHOOK_SECRET and the service verifies HMAC-SHA256.
export async function POST(req: NextRequest) {
  try {
    if (!(await isStitchPaymentsConnectedAnywhere())) {
      return NextResponse.json(
        { message: 'Stitch payments not connected for this org' },
        { status: 501 },
      );
    }
    const rawBody = await req.text();
    const sig = req.headers.get('stitch-signature');
    const result = await handleStitchWebhook(rawBody, sig);
    return NextResponse.json({ data: result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
