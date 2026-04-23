import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { readDecryptedTokens } from '@/lib/services/org-integrations';
import { verifyWebhookSignature } from '@/lib/integrations/stitch/payments-adapter';

export type PayoutInput = {
  landlordId: string;
  amountCents: number;
  externalRef: string;
};

export type PayoutInitiated = {
  payoutExternalId: string;
  status: 'PENDING';
};

export type PayoutWebhookEvent = {
  id: string;
  type: string;
  payoutExternalId: string;
  status: 'CONFIRMED' | 'FAILED' | 'PENDING';
  amountCents: number;
  raw: unknown;
};

const NOT_CONNECTED_MESSAGE = 'Stitch payouts not connected';

export async function initiatePayout(ctx: RouteCtx, input: PayoutInput): Promise<PayoutInitiated> {
  const tokens = await readDecryptedTokens(ctx, IntegrationProvider.STITCH_PAYOUTS);
  if (!tokens) throw ApiError.conflict(NOT_CONNECTED_MESSAGE);

  return {
    payoutExternalId: `stitch-payout-${input.externalRef}-${input.amountCents}`,
    status: 'PENDING',
  };
}

export function handlePayoutWebhook(rawBody: string, signatureHeader: string | null | undefined): PayoutWebhookEvent {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    throw ApiError.unauthorized('Invalid Stitch signature');
  }
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const statusRaw = typeof data.status === 'string' ? data.status.toUpperCase() : '';
  const status: PayoutWebhookEvent['status'] =
    statusRaw === 'CONFIRMED' ? 'CONFIRMED' : statusRaw === 'FAILED' ? 'FAILED' : 'PENDING';
  return {
    id: String(payload.id ?? ''),
    type: String(payload.type ?? ''),
    payoutExternalId: String(data.payoutExternalId ?? ''),
    status,
    amountCents: typeof data.amountCents === 'number' ? data.amountCents : 0,
    raw: payload,
  };
}

export async function isPayoutsConnectedAnywhere(): Promise<boolean> {
  const row = await db.orgIntegration.findFirst({
    where: { provider: 'STITCH_PAYOUTS', status: IntegrationStatus.CONNECTED },
    select: { id: true },
  });
  return Boolean(row);
}

export const stitchPayoutsAdapter = {
  initiatePayout,
  handlePayoutWebhook,
};
