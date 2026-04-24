import type { Allocation, PaymentReceipt, Prisma } from '@prisma/client';
import type { z } from 'zod';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import { writeAudit } from '@/lib/services/audit';
import { recordSnapshotEvent } from '@/lib/services/snapshots';
import { writeLedgerEntry } from '@/lib/services/trust';
import { resolveDialect, type BankCsvDialect } from '@/lib/integrations/bank-csv/dialects';
import type {
  recordIncomingPaymentSchema,
  allocateReceiptSchema,
  AllocationInput,
} from '@/lib/zod/payments';

type TxClient = Prisma.TransactionClient;
type DbLike = TxClient | typeof db;

const REVERSAL_WINDOW_DAYS = 30;

async function resolveLandlordForReceipt(
  client: DbLike,
  orgId: string,
  receipt: { tenantId: string | null; leaseId: string | null },
): Promise<string | null> {
  if (receipt.leaseId) {
    const lease = await client.lease.findFirst({
      where: { id: receipt.leaseId, orgId },
      include: { unit: { include: { property: { select: { landlordId: true } } } } },
    });
    if (lease?.unit.property.landlordId) return lease.unit.property.landlordId;
  }
  if (receipt.tenantId) {
    const link = await client.leaseTenant.findFirst({
      where: {
        tenantId: receipt.tenantId,
        lease: { orgId, state: { in: ['ACTIVE', 'RENEWED'] } },
      },
      include: { lease: { include: { unit: { include: { property: { select: { landlordId: true } } } } } } },
    });
    if (link?.lease.unit.property.landlordId) return link.lease.unit.property.landlordId;
  }
  return null;
}

export async function listReceipts(
  ctx: RouteCtx,
  filters?: { tenantId?: string; leaseId?: string; source?: string },
): Promise<PaymentReceipt[]> {
  return db.paymentReceipt.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters?.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters?.leaseId ? { leaseId: filters.leaseId } : {}),
      ...(filters?.source ? { source: filters.source as PaymentReceipt['source'] } : {}),
    },
    orderBy: { receivedAt: 'desc' },
    include: { allocations: true },
  });
}

export async function getReceipt(ctx: RouteCtx, id: string): Promise<PaymentReceipt> {
  const receipt = await db.paymentReceipt.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { allocations: true },
  });
  if (!receipt) throw ApiError.notFound('Payment receipt not found');
  return receipt;
}

export async function recordIncomingPayment(
  ctx: RouteCtx,
  input: z.infer<typeof recordIncomingPaymentSchema>,
): Promise<PaymentReceipt> {
  const result = await db.$transaction(async (tx) => {
    const created = await tx.paymentReceipt.create({
      data: {
        orgId: ctx.orgId,
        tenantId: input.tenantId ?? null,
        leaseId: input.leaseId ?? null,
        receivedAt: new Date(input.receivedAt),
        amountCents: input.amountCents,
        method: input.method,
        source: input.source,
        externalRef: input.externalRef ?? null,
        note: input.note ?? null,
        recordedById: ctx.userId,
      },
    });

    const landlordId = await resolveLandlordForReceipt(tx, ctx.orgId, created);
    if (landlordId) {
      await writeLedgerEntry(
        ctx,
        {
          landlordId,
          occurredAt: created.receivedAt,
          type: 'RECEIPT',
          amountCents: created.amountCents,
          tenantId: created.tenantId,
          leaseId: created.leaseId,
          sourceType: 'PaymentReceipt',
          sourceId: created.id,
          note: created.note,
        },
        tx,
      );
    }
    return { receipt: created, landlordId };
  });

  await writeAudit(ctx, {
    entityType: 'PaymentReceipt',
    entityId: result.receipt.id,
    action: 'recordIncomingPayment',
    payload: { amountCents: result.receipt.amountCents, source: result.receipt.source },
  });
  void recordSnapshotEvent(ctx, 'PAYMENT', {
    landlordId: result.landlordId ?? undefined,
  });
  return result.receipt;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(buf);
      buf = '';
    } else {
      buf += c;
    }
  }
  out.push(buf);
  return out.map((s) => s.trim());
}

const VALID_METHODS = new Set(['EFT', 'CASH', 'CHEQUE', 'CARD_MANUAL', 'OTHER']);

function getBankRefPrefix(): string {
  return process.env.BANK_REF_PREFIX?.trim() || 'PMO-';
}

async function resolveLeaseIdFromReference(
  orgId: string,
  reference: string,
): Promise<string | null> {
  const prefix = getBankRefPrefix();
  if (!reference.startsWith(prefix)) return null;
  const candidate = reference.slice(prefix.length).trim();
  if (!candidate) return null;
  const lease = await db.lease.findFirst({
    where: { id: candidate, orgId },
    select: { id: true },
  });
  return lease?.id ?? null;
}

export async function importReceiptsCsv(
  ctx: RouteCtx,
  csv: string,
  dialect: BankCsvDialect = 'generic',
): Promise<{ created: PaymentReceipt[]; skipped: { row: number; reason: string }[] }> {
  const dialectConfig = resolveDialect(dialect);

  const rawLines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) throw ApiError.validation({ csv: 'Empty CSV' });

  const headers = parseCsvLine(rawLines[0]).map((h) => h.trim());
  const columnMap = dialectConfig.columns;
  for (const required of Object.values(columnMap)) {
    if (!headers.includes(required)) {
      throw ApiError.validation({ csv: `Missing header: ${required}` });
    }
  }
  const idx = (h: string) => headers.indexOf(h);

  const created: PaymentReceipt[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let r = 1; r < rawLines.length; r++) {
    const cells = parseCsvLine(rawLines[r]);
    const receivedAtRaw = cells[idx(columnMap.receivedAt)] ?? '';
    const amountRaw = cells[idx(columnMap.amount)] ?? '';
    const methodRaw = (cells[idx(columnMap.method)] ?? '').toUpperCase();
    const reference = cells[idx(columnMap.reference)] ?? '';
    const note = cells[idx(columnMap.note)] ?? '';

    if (!receivedAtRaw || Number.isNaN(Date.parse(receivedAtRaw))) {
      skipped.push({ row: r + 1, reason: 'Invalid receivedAt' });
      continue;
    }
    const amountFloat = Number(amountRaw);
    if (!Number.isFinite(amountFloat) || amountFloat <= 0) {
      skipped.push({ row: r + 1, reason: 'Invalid amount' });
      continue;
    }
    if (!VALID_METHODS.has(methodRaw)) {
      skipped.push({ row: r + 1, reason: `Invalid method: ${methodRaw}` });
      continue;
    }
    if (!reference) {
      skipped.push({ row: r + 1, reason: 'Missing reference for dedupe' });
      continue;
    }

    const dup = await db.paymentReceipt.findFirst({
      where: { orgId: ctx.orgId, externalRef: reference },
      select: { id: true },
    });
    if (dup) {
      skipped.push({ row: r + 1, reason: 'Duplicate externalRef' });
      continue;
    }

    const amountCents = Math.round(amountFloat * 100);
    const matchedLeaseId = await resolveLeaseIdFromReference(ctx.orgId, reference);
    const receipt = await recordIncomingPayment(ctx, {
      receivedAt: new Date(receivedAtRaw).toISOString(),
      amountCents,
      method: methodRaw as 'EFT',
      source: 'CSV_IMPORT',
      externalRef: reference,
      note: note || null,
      leaseId: matchedLeaseId,
    });
    if (matchedLeaseId) {
      try {
        await allocateReceipt(ctx, receipt.id, {});
      } catch (err) {
        // Best-effort allocation; leave as unapplied if nothing matches.
        if (!(err instanceof ApiError && err.code === 'CONFLICT')) throw err;
      }
    }
    created.push(receipt);
  }

  await writeAudit(ctx, {
    entityType: 'PaymentReceipt',
    entityId: 'csv-import',
    action: 'importReceiptsCsv',
    payload: { createdCount: created.length, skippedCount: skipped.length },
  });

  return { created, skipped };
}

async function autoAllocateOldestFirst(
  client: DbLike,
  ctx: RouteCtx,
  receipt: PaymentReceipt,
  remainingCents: number,
): Promise<AllocationInput[]> {
  if (!receipt.tenantId && !receipt.leaseId) return [];
  const leaseFilter: Prisma.LeaseWhereInput = { orgId: ctx.orgId };
  if (receipt.leaseId) leaseFilter.id = receipt.leaseId;
  else if (receipt.tenantId) leaseFilter.tenants = { some: { tenantId: receipt.tenantId } };

  const invoices = await client.invoice.findMany({
    where: {
      lease: leaseFilter,
      status: { in: ['DUE', 'OVERDUE'] },
    },
    orderBy: { periodStart: 'asc' },
    include: { lineItems: { include: { allocations: true } } },
  });

  const out: AllocationInput[] = [];
  let left = remainingCents;
  for (const inv of invoices) {
    if (left <= 0) break;
    for (const li of inv.lineItems) {
      if (left <= 0) break;
      const liAllocated = li.allocations
        .filter((a) => a.reversedAt === null)
        .reduce((acc, a) => acc + a.amountCents, 0);
      const due = li.amountCents - liAllocated;
      if (due <= 0) continue;
      const apply = Math.min(due, left);
      out.push({
        target: 'INVOICE_LINE_ITEM',
        invoiceLineItemId: li.id,
        amountCents: apply,
      });
      left -= apply;
    }
  }
  return out;
}

export async function allocateReceipt(
  ctx: RouteCtx,
  receiptId: string,
  input: z.infer<typeof allocateReceiptSchema>,
): Promise<Allocation[]> {
  const result = await db.$transaction(async (tx) => {
    const receipt = await tx.paymentReceipt.findFirst({
      where: { id: receiptId, orgId: ctx.orgId },
      include: { allocations: true },
    });
    if (!receipt) throw ApiError.notFound('Payment receipt not found');

    const alreadyAllocated = receipt.allocations
      .filter((a) => a.reversedAt === null)
      .reduce((acc, a) => acc + a.amountCents, 0);
    const remaining = receipt.amountCents - alreadyAllocated;
    if (remaining <= 0) throw ApiError.conflict('Receipt is fully allocated');

    const allocations: AllocationInput[] =
      input.allocations && input.allocations.length > 0
        ? input.allocations
        : await autoAllocateOldestFirst(tx, ctx, receipt, remaining);

    const total = allocations.reduce((acc, a) => acc + a.amountCents, 0);
    if (total > remaining) {
      throw ApiError.validation({
        allocations: `Total allocation (${total}) exceeds remaining (${remaining})`,
      });
    }

    const landlordId = await resolveLandlordForReceipt(tx, ctx.orgId, receipt);

    const created: Allocation[] = [];
    for (const a of allocations) {
      const row = await tx.allocation.create({
        data: {
          receiptId: receipt.id,
          target: a.target,
          invoiceLineItemId: a.invoiceLineItemId ?? null,
          depositLeaseId: a.depositLeaseId ?? null,
          amountCents: a.amountCents,
        },
      });
      created.push(row);

      if (landlordId) {
        await writeLedgerEntry(
          ctx,
          {
            landlordId,
            occurredAt: new Date(),
            type: 'ALLOCATION',
            amountCents: -a.amountCents,
            tenantId: receipt.tenantId,
            leaseId: receipt.leaseId ?? a.depositLeaseId ?? null,
            sourceType: 'Allocation',
            sourceId: row.id,
          },
          tx,
        );
      }
    }

    await writeAudit(ctx, {
      entityType: 'PaymentReceipt',
      entityId: receipt.id,
      action: 'allocateReceipt',
      payload: { count: created.length, total },
    });
    return { allocations: created, landlordId };
  });

  void recordSnapshotEvent(ctx, 'ALLOCATION', {
    landlordId: result.landlordId ?? undefined,
  });
  return result.allocations;
}

export async function reverseAllocation(
  ctx: RouteCtx,
  allocationId: string,
  reason: string,
): Promise<void> {
  const landlordId = await db.$transaction(async (tx) => {
    const allocation = await tx.allocation.findUnique({
      where: { id: allocationId },
      include: { receipt: true },
    });
    if (!allocation || allocation.receipt.orgId !== ctx.orgId) {
      throw ApiError.notFound('Allocation not found');
    }
    if (allocation.reversedAt) throw ApiError.conflict('Allocation already reversed');

    const ageMs = Date.now() - allocation.createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > REVERSAL_WINDOW_DAYS && ctx.role !== 'ADMIN') {
      throw ApiError.forbidden(
        `Allocations older than ${REVERSAL_WINDOW_DAYS} days can only be reversed by ADMIN`,
      );
    }

    await tx.allocation.update({
      where: { id: allocationId },
      data: { reversedAt: new Date(), reversedById: ctx.userId },
    });

    const landlordId = await resolveLandlordForReceipt(tx, ctx.orgId, allocation.receipt);
    if (landlordId) {
      await writeLedgerEntry(
        ctx,
        {
          landlordId,
          occurredAt: new Date(),
          type: 'REVERSAL',
          amountCents: allocation.amountCents,
          tenantId: allocation.receipt.tenantId,
          leaseId: allocation.receipt.leaseId ?? allocation.depositLeaseId ?? null,
          sourceType: 'Allocation',
          sourceId: allocation.id,
          note: reason,
        },
        tx,
      );
    }

    return landlordId;
  });

  await writeAudit(ctx, {
    entityType: 'Allocation',
    entityId: allocationId,
    action: 'reverseAllocation',
    payload: { reason },
  });
  void recordSnapshotEvent(ctx, 'ALLOCATION', {
    landlordId: landlordId ?? undefined,
  });
}
