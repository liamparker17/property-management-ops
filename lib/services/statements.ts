import type { Prisma, Statement, StatementType } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { uploadBlob } from '@/lib/blob';
import { renderStatementPdf, type StatementWithLines } from '@/lib/reports/statement-pdf';
import { writeAudit } from '@/lib/services/audit';

type Period = { start: Date; end: Date };

type LineDraft = {
  occurredAt: Date;
  description: string;
  debitCents: number;
  creditCents: number;
  sourceType?: string | null;
  sourceId?: string | null;
};

function toPeriod(input: { start: Date | string; end: Date | string }): Period {
  const start = input.start instanceof Date ? input.start : new Date(input.start);
  const end = input.end instanceof Date ? input.end : new Date(input.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw ApiError.validation({ period: 'Invalid period' });
  }
  if (start.getTime() > end.getTime()) {
    throw ApiError.validation({ period: 'period.start must be <= period.end' });
  }
  return { start, end };
}

function sortLines(lines: LineDraft[]): LineDraft[] {
  return [...lines].sort((a, b) => {
    const diff = a.occurredAt.getTime() - b.occurredAt.getTime();
    if (diff !== 0) return diff;
    return (a.sourceId ?? '').localeCompare(b.sourceId ?? '');
  });
}

function computeRunning(opening: number, lines: LineDraft[]) {
  let balance = opening;
  return lines.map((l) => {
    balance = balance + l.creditCents - l.debitCents;
    return { ...l, runningBalanceCents: balance };
  });
}

async function persistStatement(
  ctx: RouteCtx,
  args: {
    type: StatementType;
    subjectType: string;
    subjectId: string;
    period: Period;
    openingBalanceCents: number;
    lines: Array<LineDraft & { runningBalanceCents: number }>;
    totalsJson: Prisma.InputJsonValue;
  },
): Promise<Statement> {
  const closing =
    args.lines.length === 0
      ? args.openingBalanceCents
      : args.lines[args.lines.length - 1].runningBalanceCents;

  const statement = await db.$transaction(async (tx) => {
    const created = await tx.statement.create({
      data: {
        orgId: ctx.orgId,
        type: args.type,
        subjectType: args.subjectType,
        subjectId: args.subjectId,
        periodStart: args.period.start,
        periodEnd: args.period.end,
        openingBalanceCents: args.openingBalanceCents,
        closingBalanceCents: closing,
        totalsJson: args.totalsJson,
      },
    });
    for (const line of args.lines) {
      await tx.statementLine.create({
        data: {
          statementId: created.id,
          occurredAt: line.occurredAt,
          description: line.description,
          debitCents: line.debitCents,
          creditCents: line.creditCents,
          runningBalanceCents: line.runningBalanceCents,
          sourceType: line.sourceType ?? null,
          sourceId: line.sourceId ?? null,
        },
      });
    }
    return created;
  });

  const storageKey = await uploadPdf(ctx, statement.id);
  const updated = await db.statement.update({
    where: { id: statement.id },
    data: { storageKey },
  });

  await writeAudit(ctx, {
    entityType: 'Statement',
    entityId: statement.id,
    action: `generate${args.type.charAt(0) + args.type.slice(1).toLowerCase()}Statement`,
    payload: {
      subjectType: args.subjectType,
      subjectId: args.subjectId,
      periodStart: args.period.start.toISOString(),
      periodEnd: args.period.end.toISOString(),
      lineCount: args.lines.length,
    },
  });

  return updated;
}

type UploadFn = (path: string, file: File) => Promise<{ url: string; pathname: string }>;

// Test override hook: when globalThis.__PMOPS_UPLOAD_BLOB__ is set, tests bypass Vercel Blob.
function resolveUploader(): UploadFn {
  const override = (globalThis as { __PMOPS_UPLOAD_BLOB__?: UploadFn }).__PMOPS_UPLOAD_BLOB__;
  return override ?? uploadBlob;
}

async function uploadPdf(ctx: RouteCtx, statementId: string): Promise<string> {
  const full = await db.statement.findFirst({
    where: { id: statementId, orgId: ctx.orgId },
    include: { lines: true },
  });
  if (!full) throw ApiError.notFound('Statement not found');
  const buffer = renderStatementPdf(full as StatementWithLines);
  const filename = `${statementId}.pdf`;
  const path = `statements/${ctx.orgId}/${filename}`;
  const file = new File([new Uint8Array(buffer)], filename, { type: 'application/pdf' });
  const { pathname } = await resolveUploader()(path, file);
  return pathname;
}

async function ledgerSumBefore(
  where: { orgId: string; tenantId?: string; landlordId?: string; before: Date },
): Promise<number> {
  const filter: Prisma.TrustLedgerEntryWhereInput = {
    trustAccount: { orgId: where.orgId },
    occurredAt: { lt: where.before },
  };
  if (where.tenantId) filter.tenantId = where.tenantId;
  if (where.landlordId) filter.landlordId = where.landlordId;
  const entries = await db.trustLedgerEntry.findMany({
    where: filter,
    select: { amountCents: true },
  });
  return entries.reduce((sum, e) => sum + e.amountCents, 0);
}

export async function generateTenantStatement(
  ctx: RouteCtx,
  tenantId: string,
  period: { start: Date | string; end: Date | string },
): Promise<Statement> {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId, orgId: ctx.orgId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!tenant) throw ApiError.notFound('Tenant not found');
  const p = toPeriod(period);

  const opening = await ledgerSumBefore({ orgId: ctx.orgId, tenantId, before: p.start });

  const receipts = await db.paymentReceipt.findMany({
    where: {
      orgId: ctx.orgId,
      tenantId,
      receivedAt: { gte: p.start, lte: p.end },
    },
    include: { allocations: true },
    orderBy: { receivedAt: 'asc' },
  });

  const drafts: LineDraft[] = [];
  let receiptsTotal = 0;
  let allocationsTotal = 0;
  for (const r of receipts) {
    drafts.push({
      occurredAt: r.receivedAt,
      description: `Receipt ${r.method}${r.externalRef ? ` · ${r.externalRef}` : ''}`,
      debitCents: 0,
      creditCents: r.amountCents,
      sourceType: 'PaymentReceipt',
      sourceId: r.id,
    });
    receiptsTotal += r.amountCents;
    for (const a of r.allocations) {
      if (a.reversedAt && a.reversedAt.getTime() < p.start.getTime()) continue;
      drafts.push({
        occurredAt: a.createdAt,
        description: `Allocation · ${a.target}`,
        debitCents: a.amountCents,
        creditCents: 0,
        sourceType: 'Allocation',
        sourceId: a.id,
      });
      allocationsTotal += a.amountCents;
    }
  }

  const sorted = sortLines(drafts);
  const lines = computeRunning(opening, sorted);

  return persistStatement(ctx, {
    type: 'TENANT',
    subjectType: 'Tenant',
    subjectId: tenantId,
    period: p,
    openingBalanceCents: opening,
    lines,
    totalsJson: {
      receiptsCents: receiptsTotal,
      allocationsCents: allocationsTotal,
    } as Prisma.InputJsonValue,
  });
}

export async function generateLandlordStatement(
  ctx: RouteCtx,
  landlordId: string,
  period: { start: Date | string; end: Date | string },
): Promise<Statement> {
  const landlord = await db.landlord.findFirst({
    where: { id: landlordId, orgId: ctx.orgId },
    select: { id: true, name: true },
  });
  if (!landlord) throw ApiError.notFound('Landlord not found');
  const p = toPeriod(period);

  const opening = await ledgerSumBefore({ orgId: ctx.orgId, landlordId, before: p.start });

  const entries = await db.trustLedgerEntry.findMany({
    where: {
      landlordId,
      trustAccount: { orgId: ctx.orgId },
      type: { in: ['RECEIPT', 'DISBURSEMENT', 'FEE'] },
      occurredAt: { gte: p.start, lte: p.end },
    },
    orderBy: { occurredAt: 'asc' },
  });

  let receiptsTotal = 0;
  let disbursementsTotal = 0;
  let feesTotal = 0;
  const drafts: LineDraft[] = entries.map((e) => {
    const amount = e.amountCents;
    const isCredit = amount >= 0;
    if (e.type === 'RECEIPT') receiptsTotal += amount;
    if (e.type === 'DISBURSEMENT') disbursementsTotal += amount;
    if (e.type === 'FEE') feesTotal += amount;
    return {
      occurredAt: e.occurredAt,
      description: `${e.type}${e.note ? ` · ${e.note}` : ''}`,
      debitCents: isCredit ? 0 : Math.abs(amount),
      creditCents: isCredit ? amount : 0,
      sourceType: 'TrustLedgerEntry',
      sourceId: e.id,
    };
  });

  const sorted = sortLines(drafts);
  const lines = computeRunning(opening, sorted);

  return persistStatement(ctx, {
    type: 'LANDLORD',
    subjectType: 'Landlord',
    subjectId: landlordId,
    period: p,
    openingBalanceCents: opening,
    lines,
    totalsJson: {
      receiptsCents: receiptsTotal,
      disbursementsCents: disbursementsTotal,
      feesCents: feesTotal,
    } as Prisma.InputJsonValue,
  });
}

export async function generateTrustStatement(
  ctx: RouteCtx,
  landlordId: string,
  period: { start: Date | string; end: Date | string },
): Promise<Statement> {
  const landlord = await db.landlord.findFirst({
    where: { id: landlordId, orgId: ctx.orgId },
    select: { id: true, name: true },
  });
  if (!landlord) throw ApiError.notFound('Landlord not found');
  const p = toPeriod(period);

  const opening = await ledgerSumBefore({ orgId: ctx.orgId, landlordId, before: p.start });

  const entries = await db.trustLedgerEntry.findMany({
    where: {
      landlordId,
      trustAccount: { orgId: ctx.orgId },
      occurredAt: { gte: p.start, lte: p.end },
    },
    orderBy: { occurredAt: 'asc' },
  });

  type GroupKey = string;
  const groups = new Map<
    GroupKey,
    { tenantId: string | null; leaseId: string | null; amountCents: number; earliestAt: Date }
  >();
  for (const e of entries) {
    const key: GroupKey = `${e.tenantId ?? 'none'}:${e.leaseId ?? 'none'}`;
    const existing = groups.get(key);
    if (existing) {
      existing.amountCents += e.amountCents;
      if (e.occurredAt.getTime() < existing.earliestAt.getTime()) {
        existing.earliestAt = e.occurredAt;
      }
    } else {
      groups.set(key, {
        tenantId: e.tenantId,
        leaseId: e.leaseId,
        amountCents: e.amountCents,
        earliestAt: e.occurredAt,
      });
    }
  }

  const tenantIds = [...new Set([...groups.values()].map((g) => g.tenantId).filter((x): x is string => !!x))];
  const leaseIds = [...new Set([...groups.values()].map((g) => g.leaseId).filter((x): x is string => !!x))];

  const tenants = tenantIds.length
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds }, orgId: ctx.orgId },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const leases = leaseIds.length
    ? await db.lease.findMany({
        where: { id: { in: leaseIds }, orgId: ctx.orgId },
        select: { id: true, unit: { select: { label: true } } },
      })
    : [];
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const leaseMap = new Map(leases.map((l) => [l.id, l]));

  const drafts: LineDraft[] = [];
  for (const [key, g] of groups.entries()) {
    const tenant = g.tenantId ? tenantMap.get(g.tenantId) : null;
    const lease = g.leaseId ? leaseMap.get(g.leaseId) : null;
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}`.trim() : 'Unassigned';
    const leaseRef = lease ? (lease.unit?.label ?? lease.id) : 'No lease';
    const description = `${tenantName} · ${leaseRef}`;
    const isCredit = g.amountCents >= 0;
    drafts.push({
      occurredAt: g.earliestAt,
      description,
      debitCents: isCredit ? 0 : Math.abs(g.amountCents),
      creditCents: isCredit ? g.amountCents : 0,
      sourceType: 'TrustGroup',
      sourceId: key,
    });
  }

  const sorted = sortLines(drafts);
  const lines = computeRunning(opening, sorted);

  return persistStatement(ctx, {
    type: 'TRUST',
    subjectType: 'Landlord',
    subjectId: landlordId,
    period: p,
    openingBalanceCents: opening,
    lines,
    totalsJson: {
      groupCount: groups.size,
      netCents: [...groups.values()].reduce((s, g) => s + g.amountCents, 0),
    } as Prisma.InputJsonValue,
  });
}

export async function regenerateStatement(ctx: RouteCtx, statementId: string): Promise<Statement> {
  const existing = await db.statement.findFirst({
    where: { id: statementId, orgId: ctx.orgId },
    include: { lines: true },
  });
  if (!existing) throw ApiError.notFound('Statement not found');

  const buffer = renderStatementPdf(existing as StatementWithLines);
  const filename = `${statementId}.pdf`;
  const path = `statements/${ctx.orgId}/${filename}`;
  const file = new File([new Uint8Array(buffer)], filename, { type: 'application/pdf' });
  const { pathname } = await resolveUploader()(path, file);

  const updated = await db.statement.update({
    where: { id: statementId },
    data: { storageKey: pathname, generatedAt: new Date() },
  });

  await writeAudit(ctx, {
    entityType: 'Statement',
    entityId: statementId,
    action: 'regenerateStatement',
    payload: { storageKey: pathname },
  });

  return updated;
}

export async function listStatements(
  ctx: RouteCtx,
  filters?: { type?: StatementType; subjectType?: string; subjectId?: string },
): Promise<Statement[]> {
  return db.statement.findMany({
    where: {
      orgId: ctx.orgId,
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.subjectType ? { subjectType: filters.subjectType } : {}),
      ...(filters?.subjectId ? { subjectId: filters.subjectId } : {}),
    },
    orderBy: { generatedAt: 'desc' },
  });
}
