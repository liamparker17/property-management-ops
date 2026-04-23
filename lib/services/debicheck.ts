import type { DebiCheckMandate, PaymentReceipt } from '@prisma/client';
import { IntegrationStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { stitchDebicheckAdapter } from '@/lib/integrations/stitch/debicheck-adapter';
import { writeAudit } from '@/lib/services/audit';
import { createNotification } from '@/lib/services/notifications';
import { recordIncomingPayment } from '@/lib/services/payments';

export async function createMandateRequest(
  ctx: RouteCtx,
  leaseId: string,
  upperCapCents: number,
): Promise<DebiCheckMandate> {
  if (upperCapCents <= 0) {
    throw ApiError.validation({ upperCapCents: 'Must be positive' });
  }
  const lease = await db.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    include: { tenants: { where: { isPrimary: true }, take: 1 } },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  const primary = lease.tenants[0];
  if (!primary) throw ApiError.conflict('Lease has no primary tenant');

  const existing = await db.debiCheckMandate.findUnique({ where: { leaseId } });
  if (existing && existing.status !== 'REVOKED' && existing.status !== 'FAILED') {
    return existing;
  }

  const adapterResult = await stitchDebicheckAdapter.requestMandate(ctx, leaseId, upperCapCents);

  const mandate = await db.debiCheckMandate.upsert({
    where: { leaseId },
    update: {
      upperCapCents,
      mandateExternalId: adapterResult.mandateExternalId,
      status: 'PENDING_SIGNATURE',
      tenantId: primary.tenantId,
      signedAt: null,
    },
    create: {
      orgId: ctx.orgId,
      leaseId,
      tenantId: primary.tenantId,
      mandateExternalId: adapterResult.mandateExternalId,
      upperCapCents,
      status: 'PENDING_SIGNATURE',
    },
  });

  await writeAudit(ctx, {
    entityType: 'DebiCheckMandate',
    entityId: mandate.id,
    action: 'requestMandate',
    payload: { leaseId, upperCapCents, mandateExternalId: mandate.mandateExternalId },
  });

  return mandate;
}

export async function submitMonthlyCollection(
  ctx: RouteCtx,
  mandateId: string,
  amountCents: number,
): Promise<PaymentReceipt> {
  const mandate = await db.debiCheckMandate.findFirst({
    where: { id: mandateId, orgId: ctx.orgId },
  });
  if (!mandate) throw ApiError.notFound('DebiCheck mandate not found');
  if (mandate.status !== 'ACTIVE') {
    throw ApiError.conflict('Mandate is not ACTIVE');
  }
  if (amountCents > mandate.upperCapCents) {
    throw ApiError.conflict('Collection amount exceeds upper cap');
  }

  const result = await stitchDebicheckAdapter.submitCollection(
    ctx,
    mandate.mandateExternalId ?? mandate.id,
    amountCents,
  );

  // Collection receipt lands as DEBICHECK source; status flips to CONFIRMED via webhook in real flows.
  const receipt = await recordIncomingPayment(ctx, {
    tenantId: mandate.tenantId,
    leaseId: mandate.leaseId,
    receivedAt: new Date().toISOString(),
    amountCents,
    method: 'EFT',
    source: 'DEBICHECK',
    externalRef: result.collectionExternalId,
    note: 'DebiCheck collection submitted',
  });

  await writeAudit(ctx, {
    entityType: 'DebiCheckMandate',
    entityId: mandate.id,
    action: 'submitCollection',
    payload: { amountCents, collectionExternalId: result.collectionExternalId },
  });

  return receipt;
}

export async function retryUnpaidCollection(
  ctx: RouteCtx,
  mandateId: string,
  originalInvoiceId: string,
): Promise<void> {
  const invoice = await db.invoice.findFirst({
    where: { id: originalInvoiceId, orgId: ctx.orgId },
  });
  if (!invoice) return;
  if (invoice.status === 'PAID') return;

  const mandate = await db.debiCheckMandate.findFirst({
    where: { id: mandateId, orgId: ctx.orgId },
  });
  if (!mandate || mandate.status !== 'ACTIVE') return;

  try {
    await submitMonthlyCollection(ctx, mandateId, invoice.totalCents || invoice.amountCents);
  } catch {
    // Retry failed too; fall through to OVERDUE flip.
  }

  // Re-check after retry — if still unpaid, mark overdue + notify.
  const refreshed = await db.invoice.findFirst({ where: { id: originalInvoiceId } });
  if (refreshed && refreshed.status !== 'PAID') {
    await db.invoice.update({
      where: { id: originalInvoiceId },
      data: { status: 'OVERDUE' },
    });
    await createNotification(ctx, {
      role: 'PROPERTY_MANAGER',
      type: 'DEBICHECK_RETRY_FAILED',
      subject: 'DebiCheck retry failed',
      body: `Invoice ${originalInvoiceId} could not be collected via DebiCheck retry.`,
      entityType: 'Invoice',
      entityId: originalInvoiceId,
    });
    await writeAudit(ctx, {
      entityType: 'Invoice',
      entityId: originalInvoiceId,
      action: 'debicheckRetryFailed',
      payload: { mandateId },
    });
  }
}

export async function isDebicheckConnectedAnywhere(): Promise<boolean> {
  const row = await db.orgIntegration.findFirst({
    where: { provider: 'STITCH_DEBICHECK', status: IntegrationStatus.CONNECTED },
    select: { id: true },
  });
  return Boolean(row);
}

export async function applyMandateWebhookStatus(mandateExternalId: string, status: string) {
  const mandate = await db.debiCheckMandate.findFirst({ where: { mandateExternalId } });
  if (!mandate) return null;
  const next =
    status === 'ACTIVE'
      ? { status: 'ACTIVE' as const, signedAt: new Date() }
      : status === 'REVOKED'
        ? { status: 'REVOKED' as const }
        : status === 'FAILED'
          ? { status: 'FAILED' as const }
          : null;
  if (!next) return mandate;
  return db.debiCheckMandate.update({ where: { id: mandate.id }, data: next });
}
