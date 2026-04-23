import { createHmac, timingSafeEqual } from 'node:crypto';
import { IntegrationProvider } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { readDecryptedTokens } from '@/lib/services/org-integrations';

export type CheckoutInput = {
  invoiceId: string;
  amountCents: number;
  tenantId: string;
  leaseId: string | null;
};

export type CheckoutSession = {
  sessionId: string;
  redirectUrl: string;
};

export type StitchWebhookEvent = {
  id: string;
  type: 'payment.confirmed' | 'payment.failed' | string;
  occurredAt: string;
  externalRef?: string;
  amountCents?: number;
  leaseId?: string;
  tenantId?: string;
  invoiceId?: string;
  raw: unknown;
};

const NOT_CONNECTED_MESSAGE = 'Stitch payments not connected';

function readEnv(name: string): string | null {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

// HMAC-SHA256 webhook signature; returns false when STITCH_WEBHOOK_SECRET is unset so callers can 501 cleanly.
export function verifyWebhookSignature(rawBody: string, header: string | null | undefined): boolean {
  if (!header) return false;
  const secret = readEnv('STITCH_WEBHOOK_SECRET');
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = header.replace(/^sha256=/, '').trim();
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseWebhookEvent(payload: unknown): StitchWebhookEvent {
  if (!payload || typeof payload !== 'object') {
    throw ApiError.validation({ payload: 'Invalid Stitch webhook payload' });
  }
  const record = payload as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  const type = typeof record.type === 'string' ? record.type : null;
  if (!id || !type) {
    throw ApiError.validation({ payload: 'Missing id or type in Stitch webhook' });
  }
  const data = (record.data ?? {}) as Record<string, unknown>;
  return {
    id,
    type,
    occurredAt: typeof record.occurredAt === 'string' ? record.occurredAt : new Date().toISOString(),
    externalRef: typeof data.externalRef === 'string' ? data.externalRef : undefined,
    amountCents: typeof data.amountCents === 'number' ? data.amountCents : undefined,
    leaseId: typeof data.leaseId === 'string' ? data.leaseId : undefined,
    tenantId: typeof data.tenantId === 'string' ? data.tenantId : undefined,
    invoiceId: typeof data.invoiceId === 'string' ? data.invoiceId : undefined,
    raw: payload,
  };
}

export async function createCheckoutSession(
  ctx: RouteCtx,
  input: CheckoutInput,
): Promise<CheckoutSession> {
  const tokens = await readDecryptedTokens(ctx, IntegrationProvider.STITCH_PAYMENTS);
  if (!tokens) {
    throw ApiError.conflict(NOT_CONNECTED_MESSAGE);
  }
  const partnerId = readEnv('STITCH_PARTNER_ID');
  // Deterministic fixture URL until STITCH_PARTNER_ID is wired up; real network call lands with live creds.
  const sessionId = `stitch-${input.invoiceId}-${input.amountCents}`;
  const prefix = partnerId ? `https://checkout.stitch.money/${partnerId}` : 'https://checkout.stitch.test/sandbox';
  return { sessionId, redirectUrl: `${prefix}/${sessionId}` };
}

export const stitchPaymentsAdapter = {
  createCheckoutSession,
  verifyWebhookSignature,
  parseWebhookEvent,
};
