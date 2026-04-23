import { InvoiceStatus, Prisma } from '@prisma/client';
import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';
import { createNotification } from '@/lib/services/notifications';
import { estimateMissingReading, latestReading } from '@/lib/services/utilities';
import type { z } from 'zod';
import type { addLineItemSchema } from '@/lib/zod/billing';

export type InvoiceLineItemDraft = {
  kind:
    | 'RENT'
    | 'UTILITY_WATER'
    | 'UTILITY_ELECTRICITY'
    | 'UTILITY_GAS'
    | 'UTILITY_SEWER'
    | 'UTILITY_REFUSE'
    | 'ADJUSTMENT'
    | 'LATE_FEE'
    | 'DEPOSIT_CHARGE';
  description: string;
  quantity?: Prisma.Decimal | null;
  unitRateCents?: number | null;
  amountCents: number;
  sourceType?: string | null;
  sourceId?: string | null;
  estimated?: boolean;
};

function monthStartUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addUtcMonths(d: Date, n: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
}

function utilityKindFor(type: 'WATER' | 'ELECTRICITY' | 'GAS' | 'SEWER' | 'REFUSE' | 'OTHER') {
  switch (type) {
    case 'WATER':
      return 'UTILITY_WATER' as const;
    case 'ELECTRICITY':
      return 'UTILITY_ELECTRICITY' as const;
    case 'GAS':
      return 'UTILITY_GAS' as const;
    case 'SEWER':
      return 'UTILITY_SEWER' as const;
    case 'REFUSE':
      return 'UTILITY_REFUSE' as const;
    case 'OTHER':
      return 'ADJUSTMENT' as const;
  }
}

async function isUtilitiesBillingEnabled(orgId: string): Promise<{
  enabled: boolean;
  allowEstimates: boolean;
}> {
  const feature = await db.orgFeature.findUnique({
    where: { orgId_key: { orgId, key: 'UTILITIES_BILLING' } },
    select: { enabled: true, config: true },
  });
  const enabled = feature?.enabled ?? false;
  const cfg = (feature?.config ?? null) as { allowEstimates?: boolean } | null;
  return { enabled, allowEstimates: cfg?.allowEstimates === true };
}

async function resolveTariff(
  orgId: string,
  propertyId: string,
  type: 'WATER' | 'ELECTRICITY' | 'GAS' | 'SEWER' | 'REFUSE' | 'OTHER',
  asOf: Date,
) {
  const tariffs = await db.utilityTariff.findMany({
    where: {
      orgId,
      type,
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    },
    orderBy: [{ effectiveFrom: 'desc' }],
  });
  return (
    tariffs.find((t) => t.propertyId === propertyId) ??
    tariffs.find((t) => t.propertyId === null) ??
    null
  );
}

export async function calculateUtilityChargesForLease(
  ctx: RouteCtx,
  leaseId: string,
  periodStart: Date,
): Promise<InvoiceLineItemDraft[]> {
  const lease = await db.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    select: {
      id: true,
      unitId: true,
      unit: { select: { propertyId: true } },
    },
  });
  if (!lease) return [];

  const periodEnd = addUtcMonths(periodStart, 1);
  const meters = await db.meter.findMany({
    where: { orgId: ctx.orgId, unitId: lease.unitId, retiredAt: null },
  });
  if (meters.length === 0) return [];

  const drafts: InvoiceLineItemDraft[] = [];
  for (const meter of meters) {
    const startReading = await latestReading(ctx, meter.id, periodStart);
    const existingEndReading = await latestReading(ctx, meter.id, periodEnd);
    let estimated = false;
    let endReading: {
      id: string;
      readingValue: Prisma.Decimal | { toString(): string };
      source: string;
    } | null = existingEndReading;

    if (!endReading) {
      const est = await estimateMissingReading(ctx, meter.id, periodEnd);
      endReading = {
        id: 'ESTIMATED',
        readingValue: est.value,
        source: 'ESTIMATED',
      };
      estimated = true;
    } else if (endReading.source === 'ESTIMATED') {
      estimated = true;
    }

    if (!endReading) continue;

    const startVal = new Prisma.Decimal(
      startReading ? startReading.readingValue.toString() : '0',
    );
    const endVal = new Prisma.Decimal(endReading.readingValue.toString());
    const delta = endVal.minus(startVal);
    if (delta.lte(0)) continue;

    const tariff = await resolveTariff(ctx.orgId, lease.unit.propertyId, meter.type, periodStart);
    if (!tariff) continue;

    let amountCents = 0;
    let unitRateCents: number | null = null;
    if (tariff.structure === 'FLAT' && tariff.flatUnitRateCents != null) {
      unitRateCents = tariff.flatUnitRateCents;
      amountCents = Math.round(delta.toNumber() * tariff.flatUnitRateCents);
    } else if (tariff.structure === 'TIERED' && tariff.tieredJson) {
      const tiers = tariff.tieredJson as Array<{ uptoQty: number; unitRateCents: number }>;
      let remaining = delta.toNumber();
      let prevCap = 0;
      for (const tier of tiers) {
        if (remaining <= 0) break;
        const tierQty = Math.max(0, Math.min(remaining, tier.uptoQty - prevCap));
        amountCents += Math.round(tierQty * tier.unitRateCents);
        remaining -= tierQty;
        prevCap = tier.uptoQty;
      }
      if (remaining > 0 && tiers.length > 0) {
        amountCents += Math.round(remaining * tiers[tiers.length - 1].unitRateCents);
      }
    }

    drafts.push({
      kind: utilityKindFor(meter.type),
      description: `${meter.type.toLowerCase()} usage`,
      quantity: delta,
      unitRateCents,
      amountCents,
      sourceType: 'MeterReading',
      sourceId: endReading.id === 'ESTIMATED' ? null : endReading.id,
      estimated,
    });
  }
  return drafts;
}

export async function rebuildInvoiceTotals(invoiceId: string): Promise<void> {
  const lines = await db.invoiceLineItem.findMany({
    where: { invoiceId },
    select: { amountCents: true },
  });
  const subtotal = lines.reduce((acc, l) => acc + l.amountCents, 0);
  const tax = 0;
  const total = subtotal + tax;
  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      subtotalCents: subtotal,
      taxCents: tax,
      totalCents: total,
      amountCents: total,
    },
  });
}

export async function generateBillingRun(ctx: RouteCtx, periodStart: Date) {
  const period = monthStartUtc(periodStart);
  const periodEnd = addUtcMonths(period, 1);

  const existing = await db.billingRun.findUnique({
    where: { orgId_periodStart: { orgId: ctx.orgId, periodStart: period } },
  });
  const run = existing
    ? existing
    : await db.billingRun.create({
        data: {
          orgId: ctx.orgId,
          periodStart: period,
          status: 'DRAFT',
          createdById: ctx.userId,
        },
      });

  const leases = await db.lease.findMany({
    where: {
      orgId: ctx.orgId,
      state: { in: ['ACTIVE', 'RENEWED'] },
      startDate: { lte: periodEnd },
      endDate: { gte: period },
    },
    select: {
      id: true,
      rentAmountCents: true,
      paymentDueDay: true,
      unitId: true,
      unit: { select: { propertyId: true } },
    },
  });

  const { enabled: utilitiesEnabled } = await isUtilitiesBillingEnabled(ctx.orgId);

  let invoicesGenerated = 0;
  let estimatedLineItems = 0;

  for (const lease of leases) {
    const dueDay = Math.min(lease.paymentDueDay || 1, 28);
    const dueDate = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth(), dueDay));

    let invoice = await db.invoice.findUnique({
      where: { leaseId_periodStart: { leaseId: lease.id, periodStart: period } },
    });
    if (!invoice) {
      invoice = await db.invoice.create({
        data: {
          orgId: ctx.orgId,
          leaseId: lease.id,
          periodStart: period,
          dueDate,
          amountCents: 0,
          status: InvoiceStatus.DRAFT,
          billingRunId: run.id,
        },
      });
    } else if (invoice.billingRunId !== run.id) {
      invoice = await db.invoice.update({
        where: { id: invoice.id },
        data: { billingRunId: run.id },
      });
    }
    invoicesGenerated += 1;

    await db.invoiceLineItem.deleteMany({
      where: { invoiceId: invoice.id, sourceType: { in: ['Lease', 'MeterReading'] } },
    });

    await db.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        kind: 'RENT',
        description: 'Monthly rent',
        amountCents: lease.rentAmountCents,
        sourceType: 'Lease',
        sourceId: lease.id,
      },
    });

    if (utilitiesEnabled) {
      const utilityDrafts = await calculateUtilityChargesForLease(ctx, lease.id, period);
      for (const draft of utilityDrafts) {
        if (draft.estimated) estimatedLineItems += 1;
        await db.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            kind: draft.kind,
            description: draft.description,
            quantity:
              draft.quantity != null ? new Prisma.Decimal(draft.quantity.toString()) : null,
            unitRateCents: draft.unitRateCents ?? null,
            amountCents: draft.amountCents,
            sourceType: draft.sourceType ?? null,
            sourceId: draft.sourceId ?? null,
            estimated: draft.estimated ?? false,
          },
        });
      }
    }

    await rebuildInvoiceTotals(invoice.id);
  }

  const updatedRun = await db.billingRun.update({
    where: { id: run.id },
    data: {
      status: 'READY',
      summary: {
        invoicesGenerated,
        estimatedLineItems,
      } as Prisma.InputJsonValue,
    },
  });

  await writeAudit(ctx, {
    entityType: 'BillingRun',
    entityId: run.id,
    action: existing ? 'regenerate' : 'generate',
    payload: {
      periodStart: period.toISOString(),
      invoicesGenerated,
      estimatedLineItems,
    },
  });

  return updatedRun;
}

export async function previewBillingRun(ctx: RouteCtx, periodStart: Date) {
  const period = monthStartUtc(periodStart);
  const periodEnd = addUtcMonths(period, 1);

  const leases = await db.lease.findMany({
    where: {
      orgId: ctx.orgId,
      state: { in: ['ACTIVE', 'RENEWED'] },
      startDate: { lte: periodEnd },
      endDate: { gte: period },
    },
    select: {
      id: true,
      rentAmountCents: true,
      unitId: true,
      unit: { select: { label: true, propertyId: true, property: { select: { name: true } } } },
    },
  });

  const { enabled } = await isUtilitiesBillingEnabled(ctx.orgId);
  const rows = [] as Array<{
    leaseId: string;
    unitLabel: string;
    propertyName: string;
    rentCents: number;
    utilityLines: InvoiceLineItemDraft[];
    totalCents: number;
    hasEstimates: boolean;
  }>;

  for (const lease of leases) {
    const utilityLines = enabled
      ? await calculateUtilityChargesForLease(ctx, lease.id, period)
      : [];
    const total =
      lease.rentAmountCents + utilityLines.reduce((acc, l) => acc + l.amountCents, 0);
    rows.push({
      leaseId: lease.id,
      unitLabel: lease.unit.label,
      propertyName: lease.unit.property.name,
      rentCents: lease.rentAmountCents,
      utilityLines,
      totalCents: total,
      hasEstimates: utilityLines.some((l) => l.estimated),
    });
  }

  return { periodStart: period, rows };
}

export async function publishBillingRun(ctx: RouteCtx, runId: string) {
  const run = await db.billingRun.findFirst({
    where: { id: runId, orgId: ctx.orgId },
    include: {
      invoices: {
        include: {
          lineItems: true,
          lease: {
            select: {
              id: true,
              tenants: {
                where: { isPrimary: true },
                select: { tenant: { select: { id: true, userId: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!run) throw ApiError.notFound('Billing run not found');
  if (run.status === 'PUBLISHED') throw ApiError.conflict('Billing run already published');

  const hasEstimates = run.invoices.some((inv) =>
    inv.lineItems.some((l) => l.estimated),
  );
  if (hasEstimates) {
    const { allowEstimates } = await isUtilitiesBillingEnabled(ctx.orgId);
    if (!allowEstimates) {
      throw ApiError.conflict(
        'Billing run contains estimated line items; enable UTILITIES_BILLING.allowEstimates to publish',
      );
    }
  }

  const publishedAt = new Date();

  await db.$transaction(async (tx) => {
    for (const invoice of run.invoices) {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.DUE },
      });
    }
    await tx.billingRun.update({
      where: { id: run.id },
      data: { status: 'PUBLISHED', publishedAt },
    });
  });

  for (const invoice of run.invoices) {
    const primary = invoice.lease.tenants[0]?.tenant;
    if (primary?.userId) {
      await createNotification(ctx, {
        userId: primary.userId,
        type: 'invoice.published',
        subject: 'New invoice available',
        body: `Invoice for ${run.periodStart.toISOString().slice(0, 7)} is now due.`,
        entityType: 'Invoice',
        entityId: invoice.id,
        payload: { totalCents: invoice.totalCents },
      });
    }
  }

  await writeAudit(ctx, {
    entityType: 'BillingRun',
    entityId: run.id,
    action: 'publish',
    payload: {
      periodStart: run.periodStart.toISOString(),
      invoiceCount: run.invoices.length,
    },
  });

  return db.billingRun.findUnique({ where: { id: run.id } });
}

export async function addManualLineItem(
  ctx: RouteCtx,
  invoiceId: string,
  input: z.infer<typeof addLineItemSchema>,
) {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, orgId: ctx.orgId },
    select: { id: true, status: true },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.status === 'PAID') {
    throw ApiError.conflict('Cannot add line items to a paid invoice');
  }

  const line = await db.invoiceLineItem.create({
    data: {
      invoiceId,
      kind: input.kind,
      description: input.description,
      quantity: input.quantity != null ? new Prisma.Decimal(String(input.quantity)) : null,
      unitRateCents: input.unitRateCents ?? null,
      amountCents: input.amountCents,
      sourceType: input.sourceType ?? 'Manual',
      sourceId: input.sourceId ?? null,
      estimated: input.estimated ?? false,
    },
  });

  await rebuildInvoiceTotals(invoiceId);

  await writeAudit(ctx, {
    entityType: 'InvoiceLineItem',
    entityId: line.id,
    action: 'create',
    payload: { invoiceId, kind: line.kind, amountCents: line.amountCents },
  });

  return line;
}

export async function removeLineItem(ctx: RouteCtx, lineItemId: string) {
  const line = await db.invoiceLineItem.findFirst({
    where: { id: lineItemId, invoice: { orgId: ctx.orgId } },
    select: { id: true, invoiceId: true, kind: true, amountCents: true },
  });
  if (!line) throw ApiError.notFound('Line item not found');

  await db.invoiceLineItem.delete({ where: { id: lineItemId } });
  await rebuildInvoiceTotals(line.invoiceId);

  await writeAudit(ctx, {
    entityType: 'InvoiceLineItem',
    entityId: lineItemId,
    action: 'delete',
    payload: { invoiceId: line.invoiceId, kind: line.kind, amountCents: line.amountCents },
  });
}

export async function listBillingRuns(ctx: RouteCtx) {
  return db.billingRun.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { periodStart: 'desc' },
  });
}

export async function getBillingRun(ctx: RouteCtx, id: string) {
  const run = await db.billingRun.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      invoices: {
        include: {
          lineItems: true,
          lease: {
            select: {
              id: true,
              unit: { select: { label: true, property: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
  if (!run) throw ApiError.notFound('Billing run not found');
  return run;
}
