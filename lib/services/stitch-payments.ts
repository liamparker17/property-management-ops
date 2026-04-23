import type { PaymentReceipt } from '@prisma/client';
import { IntegrationStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { stitchPaymentsAdapter } from '@/lib/integrations/stitch/payments-adapter';
import { writeAudit } from '@/lib/services/audit';
import { allocateReceipt, recordIncomingPayment } from '@/lib/services/payments';

export type InitiateInboundPaymentInput = {
  invoiceId: string;
  amountCents: number;
};

export async function initiateInboundPayment(
  ctx: RouteCtx,
  input: InitiateInboundPaymentInput,
): Promise<{ redirectUrl: string }> {
  const invoice = await db.invoice.findFirst({
    where: { id: input.invoiceId, orgId: ctx.orgId },
    include: { lease: { include: { tenants: true } } },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');

  // Tenant initiates checkout; resolve tenantId from the current tenant's user link on the lease.
  const tenant = await db.tenant.findFirst({
    where: { userId: ctx.userId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!tenant) throw ApiError.forbidden('Tenant profile not found');

  const onLease = invoice.lease.tenants.some((t) => t.tenantId === tenant.id);
  if (!onLease) throw ApiError.forbidden('Invoice not accessible');

  const session = await stitchPaymentsAdapter.createCheckoutSession(ctx, {
    invoiceId: invoice.id,
    amountCents: input.amountCents,
    tenantId: tenant.id,
    leaseId: invoice.leaseId,
  });

  await writeAudit(ctx, {
    entityType: 'Invoice',
    entityId: invoice.id,
    action: 'stitchCheckoutInitiated',
    payload: { sessionId: session.sessionId, amountCents: input.amountCents },
  });

  return { redirectUrl: session.redirectUrl };
}

export type StitchWebhookResult =
  | { handled: true; receiptId: string }
  | { handled: false; reason: string };

export async function handleStitchWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
): Promise<StitchWebhookResult> {
  if (!stitchPaymentsAdapter.verifyWebhookSignature(rawBody, signatureHeader)) {
    throw ApiError.unauthorized('Invalid Stitch signature');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw ApiError.validation({ body: 'Invalid JSON' });
  }
  const event = stitchPaymentsAdapter.parseWebhookEvent(payload);

  if (event.type !== 'payment.confirmed') {
    return { handled: false, reason: `ignored event type ${event.type}` };
  }

  // Webhook fires once per Stitch event; externalRef=event.id makes re-delivery idempotent.
  const amountCents = event.amountCents ?? 0;
  if (amountCents <= 0) {
    return { handled: false, reason: 'missing amount' };
  }

  const orgId = await resolveOrgIdFromEvent(event);
  if (!orgId) {
    return { handled: false, reason: 'no STITCH_PAYMENTS org connected' };
  }

  const existing = await db.paymentReceipt.findFirst({
    where: { orgId, externalRef: event.id, source: 'STITCH' },
    select: { id: true },
  });
  if (existing) {
    return { handled: true, receiptId: existing.id };
  }

  const ctx: RouteCtx = { orgId, userId: 'stitch-webhook', role: 'ADMIN' };
  const receipt: PaymentReceipt = await recordIncomingPayment(ctx, {
    tenantId: event.tenantId ?? null,
    leaseId: event.leaseId ?? null,
    receivedAt: event.occurredAt,
    amountCents,
    method: 'EFT',
    source: 'STITCH',
    externalRef: event.id,
    note: 'Stitch payment confirmed',
  });

  try {
    await allocateReceipt(ctx, receipt.id, {});
  } catch (err) {
    if (!(err instanceof ApiError && err.code === 'CONFLICT')) throw err;
  }

  return { handled: true, receiptId: receipt.id };
}

async function resolveOrgIdFromEvent(event: {
  leaseId?: string;
  tenantId?: string;
  invoiceId?: string;
}): Promise<string | null> {
  if (event.leaseId) {
    const lease = await db.lease.findFirst({ where: { id: event.leaseId }, select: { orgId: true } });
    if (lease) return lease.orgId;
  }
  if (event.invoiceId) {
    const inv = await db.invoice.findFirst({ where: { id: event.invoiceId }, select: { orgId: true } });
    if (inv) return inv.orgId;
  }
  if (event.tenantId) {
    const t = await db.tenant.findFirst({ where: { id: event.tenantId }, select: { orgId: true } });
    if (t) return t.orgId;
  }
  // Fallback: any CONNECTED STITCH_PAYMENTS org to keep single-tenant stubs working.
  const anyRow = await db.orgIntegration.findFirst({
    where: { provider: 'STITCH_PAYMENTS', status: IntegrationStatus.CONNECTED },
    select: { orgId: true },
  });
  return anyRow?.orgId ?? null;
}

export async function isStitchPaymentsConnectedAnywhere(): Promise<boolean> {
  const row = await db.orgIntegration.findFirst({
    where: { provider: 'STITCH_PAYMENTS', status: IntegrationStatus.CONNECTED },
    select: { id: true },
  });
  return Boolean(row);
}
