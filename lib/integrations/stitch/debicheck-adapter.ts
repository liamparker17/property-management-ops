import { IntegrationProvider } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { readDecryptedTokens } from '@/lib/services/org-integrations';
import { verifyWebhookSignature } from '@/lib/integrations/stitch/payments-adapter';

export type MandateRequestResult = {
  mandateExternalId: string;
  signingUrl: string;
};

export type CollectionResult = {
  collectionExternalId: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
};

const NOT_CONNECTED_MESSAGE = 'Stitch DebiCheck not connected';

async function requireConnected(ctx: RouteCtx) {
  const tokens = await readDecryptedTokens(ctx, IntegrationProvider.STITCH_DEBICHECK);
  if (!tokens) throw ApiError.conflict(NOT_CONNECTED_MESSAGE);
  return tokens;
}

export async function requestMandate(
  ctx: RouteCtx,
  leaseId: string,
  upperCapCents: number,
): Promise<MandateRequestResult> {
  await requireConnected(ctx);
  const mandateExternalId = `stitch-debicheck-${leaseId}-${upperCapCents}`;
  return {
    mandateExternalId,
    signingUrl: `https://checkout.stitch.test/sandbox/debicheck/${mandateExternalId}`,
  };
}

export async function submitCollection(
  ctx: RouteCtx,
  mandateExternalId: string,
  amountCents: number,
): Promise<CollectionResult> {
  await requireConnected(ctx);
  return {
    collectionExternalId: `stitch-coll-${mandateExternalId}-${amountCents}-${Date.now()}`,
    status: 'PENDING',
  };
}

export type DebiCheckMandateWebhookEvent = {
  id: string;
  type: string;
  mandateExternalId: string;
  status: 'ACTIVE' | 'REVOKED' | 'FAILED' | 'PENDING_SIGNATURE';
  raw: unknown;
};

export type DebiCheckCollectionWebhookEvent = {
  id: string;
  type: string;
  collectionExternalId: string;
  mandateExternalId: string;
  status: 'CONFIRMED' | 'FAILED';
  amountCents: number;
  raw: unknown;
};

function parseStatus(value: unknown): DebiCheckMandateWebhookEvent['status'] {
  if (typeof value !== 'string') return 'PENDING_SIGNATURE';
  const u = value.toUpperCase();
  if (u === 'ACTIVE' || u === 'REVOKED' || u === 'FAILED') return u;
  return 'PENDING_SIGNATURE';
}

export function handleMandateWebhook(rawBody: string, signatureHeader: string | null | undefined) {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    throw ApiError.unauthorized('Invalid Stitch signature');
  }
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const event: DebiCheckMandateWebhookEvent = {
    id: String(payload.id ?? ''),
    type: String(payload.type ?? ''),
    mandateExternalId: String(data.mandateExternalId ?? ''),
    status: parseStatus(data.status),
    raw: payload,
  };
  return event;
}

export function handleCollectionWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
) {
  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    throw ApiError.unauthorized('Invalid Stitch signature');
  }
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const statusRaw = typeof data.status === 'string' ? data.status.toUpperCase() : '';
  const status: DebiCheckCollectionWebhookEvent['status'] =
    statusRaw === 'CONFIRMED' ? 'CONFIRMED' : 'FAILED';
  const event: DebiCheckCollectionWebhookEvent = {
    id: String(payload.id ?? ''),
    type: String(payload.type ?? ''),
    collectionExternalId: String(data.collectionExternalId ?? ''),
    mandateExternalId: String(data.mandateExternalId ?? ''),
    status,
    amountCents: typeof data.amountCents === 'number' ? data.amountCents : 0,
    raw: payload,
  };
  return event;
}

export const stitchDebicheckAdapter = {
  requestMandate,
  submitCollection,
  handleMandateWebhook,
  handleCollectionWebhook,
};
