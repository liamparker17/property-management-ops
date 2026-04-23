import { NextResponse } from 'next/server';

import { tpnAdapter } from '@/lib/integrations/tpn/adapter';

export async function POST() {
  return NextResponse.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: tpnAdapter.getWebhookStubMessage(),
      },
    },
    { status: 501 },
  );
}
