import { NextRequest, NextResponse } from 'next/server';

import { toErrorResponse } from '@/lib/errors';
import {
  stitchDebicheckAdapter,
} from '@/lib/integrations/stitch/debicheck-adapter';
import {
  applyMandateWebhookStatus,
  isDebicheckConnectedAnywhere,
} from '@/lib/services/debicheck';

// Unauthenticated; signature verified against STITCH_WEBHOOK_SECRET. Stub 501 until an org connects.
export async function POST(req: NextRequest) {
  try {
    if (!(await isDebicheckConnectedAnywhere())) {
      return NextResponse.json(
        { message: 'Stitch DebiCheck not connected for this org' },
        { status: 501 },
      );
    }
    const rawBody = await req.text();
    const sig = req.headers.get('stitch-signature');
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind') ?? 'mandate';
    if (kind === 'collection') {
      const event = stitchDebicheckAdapter.handleCollectionWebhook(rawBody, sig);
      return NextResponse.json({ data: { eventId: event.id, status: event.status } });
    }
    const event = stitchDebicheckAdapter.handleMandateWebhook(rawBody, sig);
    const updated = await applyMandateWebhookStatus(event.mandateExternalId, event.status);
    return NextResponse.json({ data: { eventId: event.id, mandateId: updated?.id ?? null } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
