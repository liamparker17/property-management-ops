import type { ReconciliationException, ReconciliationRun } from '@prisma/client';
import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { qboAdapter } from '@/lib/integrations/qbo/adapter';
import type { BankTransaction } from '@/lib/integrations/qbo/mapping';
import { writeAudit } from '@/lib/services/audit';

const BUSINESS_DAY_WINDOW = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ReconciliationPreview = {
  expectedMatches: number;
  expectedExceptions: number;
  bankTxCount: number;
  receiptCount: number;
};

type Period = { start: Date; end: Date };

function countBusinessDays(a: Date, b: Date): number {
  const msDiff = Math.abs(a.getTime() - b.getTime());
  const totalDays = Math.floor(msDiff / MS_PER_DAY);
  let businessDays = 0;
  const start = new Date(Math.min(a.getTime(), b.getTime()));
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(start.getTime() + i * MS_PER_DAY);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) businessDays++;
  }
  return Math.max(0, businessDays - 1);
}

async function hasQuickBooksConnected(orgId: string): Promise<boolean> {
  const row = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: IntegrationProvider.QUICKBOOKS } },
    select: { status: true },
  });
  return row?.status === IntegrationStatus.CONNECTED;
}

async function loadBankTransactions(ctx: RouteCtx, period: Period): Promise<BankTransaction[]> {
  if (await hasQuickBooksConnected(ctx.orgId)) {
    return qboAdapter.fetchBankTransactions(ctx, period.start);
  }
  const rows = await db.paymentReceipt.findMany({
    where: {
      orgId: ctx.orgId,
      source: 'CSV_IMPORT',
      receivedAt: { gte: period.start, lte: period.end },
    },
    orderBy: { receivedAt: 'asc' },
  });
  return rows.map((r) => ({
    occurredAt: r.receivedAt,
    amountCents: r.amountCents,
    reference: r.externalRef ?? r.id,
    externalId: r.externalRef ?? r.id,
    sourceRaw: r,
  }));
}

async function matchReceipt(
  orgId: string,
  tx: BankTransaction,
): Promise<{ id: string } | null> {
  if (!tx.reference) return null;
  const candidates = await db.paymentReceipt.findMany({
    where: {
      orgId,
      amountCents: tx.amountCents,
      externalRef: tx.reference,
    },
    select: { id: true, receivedAt: true },
  });
  for (const c of candidates) {
    const businessDays = countBusinessDays(c.receivedAt, tx.occurredAt);
    if (businessDays <= BUSINESS_DAY_WINDOW) return { id: c.id };
  }
  return null;
}

export async function previewRecon(
  ctx: RouteCtx,
  period: Period,
): Promise<ReconciliationPreview> {
  const bankTx = await loadBankTransactions(ctx, period);
  const receipts = await db.paymentReceipt.findMany({
    where: {
      orgId: ctx.orgId,
      receivedAt: { gte: period.start, lte: period.end },
    },
    select: { id: true },
  });
  let matches = 0;
  for (const tx of bankTx) {
    const match = await matchReceipt(ctx.orgId, tx);
    if (match) matches++;
  }
  return {
    expectedMatches: matches,
    expectedExceptions: bankTx.length - matches,
    bankTxCount: bankTx.length,
    receiptCount: receipts.length,
  };
}

export async function runTrustReconciliation(
  ctx: RouteCtx,
  period: Period,
): Promise<ReconciliationRun> {
  const run = await db.reconciliationRun.create({
    data: {
      orgId: ctx.orgId,
      periodStart: period.start,
      periodEnd: period.end,
      status: 'RUNNING',
    },
  });

  const bankTx = await loadBankTransactions(ctx, period);

  let matched = 0;
  let exceptions = 0;
  const seenEntityIds = new Set<string>();

  for (const tx of bankTx) {
    const match = await matchReceipt(ctx.orgId, tx);
    if (match) {
      matched++;
      continue;
    }

    if (seenEntityIds.has(tx.externalId)) continue;
    seenEntityIds.add(tx.externalId);

    // Deterministic upsert by (runId set, entityType, entityId) — on re-run we delete the prior run's
    // exceptions first (via reconciliationRun delete cascade) OR we reuse same run id via lookup.
    const existingForOrg = await db.reconciliationException.findFirst({
      where: {
        run: {
          orgId: ctx.orgId,
          periodStart: period.start,
          periodEnd: period.end,
        },
        entityType: 'BankTransaction',
        entityId: tx.externalId,
        runId: { not: run.id },
      },
      select: { id: true },
    });
    if (existingForOrg) {
      await db.reconciliationException.update({
        where: { id: existingForOrg.id },
        data: {
          runId: run.id,
          kind: 'UNMATCHED_BANK_TX',
          detail: {
            amountCents: tx.amountCents,
            occurredAt: tx.occurredAt.toISOString(),
            reference: tx.reference,
          },
        },
      });
    } else {
      await db.reconciliationException.create({
        data: {
          runId: run.id,
          kind: 'UNMATCHED_BANK_TX',
          entityType: 'BankTransaction',
          entityId: tx.externalId,
          detail: {
            amountCents: tx.amountCents,
            occurredAt: tx.occurredAt.toISOString(),
            reference: tx.reference,
          },
        },
      });
    }
    exceptions++;
  }

  const updated = await db.reconciliationRun.update({
    where: { id: run.id },
    data: {
      status: 'COMPLETED',
      summary: {
        bankTxCount: bankTx.length,
        matched,
        exceptions,
      },
    },
  });

  await writeAudit(ctx, {
    entityType: 'ReconciliationRun',
    entityId: updated.id,
    action: 'runTrustReconciliation',
    payload: {
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      bankTxCount: bankTx.length,
      matched,
      exceptions,
    },
  });

  return updated;
}

export async function listReconciliationRuns(
  ctx: RouteCtx,
  limit = 20,
): Promise<ReconciliationRun[]> {
  return db.reconciliationRun.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { exceptions: true },
  });
}

export async function resolveException(
  ctx: RouteCtx,
  id: string,
  note: string,
): Promise<ReconciliationException> {
  const existing = await db.reconciliationException.findFirst({
    where: { id, run: { orgId: ctx.orgId } },
  });
  if (!existing) throw ApiError.notFound('Exception not found');
  if (existing.resolvedAt) throw ApiError.conflict('Exception already resolved');

  const updated = await db.reconciliationException.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      resolvedById: ctx.userId,
    },
  });

  await writeAudit(ctx, {
    entityType: 'ReconciliationException',
    entityId: id,
    action: 'resolveException',
    payload: { note },
  });

  return updated;
}
