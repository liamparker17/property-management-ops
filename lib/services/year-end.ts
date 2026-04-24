import type { AnnualReconciliation, FinancialYear, Prisma } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import {
  FINANCIAL_YEAR_START,
  resolveFinancialYearForDate,
  type FinancialYearWindow,
} from '@/lib/financial-year';
import { withRoleScopeFilter } from '@/lib/services/role-scope';
import { writeAudit } from '@/lib/services/audit';

type YearScope = { type: 'ORG' | 'PROPERTY' | 'LANDLORD'; id?: string };

function ensureUtcDate(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

function matchesFinancialYearStart(date: Date) {
  return (
    date.getUTCMonth() + 1 === FINANCIAL_YEAR_START.month &&
    date.getUTCDate() === FINANCIAL_YEAR_START.day
  );
}

function toYearWindow(year: FinancialYear): FinancialYearWindow {
  return {
    startDate: ensureUtcDate(year.startDate),
    endDate: new Date(
      Date.UTC(
        year.endDate.getUTCFullYear(),
        year.endDate.getUTCMonth(),
        year.endDate.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    ),
  };
}

function sum(values: Array<{ amountCents: number }>) {
  return values.reduce((total, row) => total + row.amountCents, 0);
}

async function assertScopeAccess(ctx: RouteCtx, scope: YearScope): Promise<void> {
  if (scope.type === 'ORG') {
    if (ctx.role === 'LANDLORD') {
      throw ApiError.forbidden('Landlord accounts cannot access org-wide reconciliations');
    }
    return;
  }

  if (!scope.id) {
    throw ApiError.badRequest(`${scope.type} scope requires an id`);
  }

  if (scope.type === 'PROPERTY') {
    const property = await db.property.findFirst({
      where: withRoleScopeFilter(ctx, { id: scope.id, orgId: ctx.orgId, deletedAt: null }),
      select: { id: true },
    });
    if (!property) throw ApiError.forbidden('Property is not available to this account');
    return;
  }

  if (ctx.role === 'LANDLORD') {
    if (!ctx.user?.landlordId || ctx.user.landlordId !== scope.id) {
      throw ApiError.forbidden('Landlord is not available to this account');
    }
    return;
  }

  const landlord = await db.landlord.findFirst({
    where: { id: scope.id, orgId: ctx.orgId, archivedAt: null },
    select: { id: true },
  });
  if (!landlord) throw ApiError.notFound('Landlord not found');
}

async function buildSummary(
  ctx: RouteCtx,
  year: FinancialYear,
  scope: YearScope,
): Promise<Prisma.InputJsonValue> {
  const window = toYearWindow(year);
  const invoiceWhere: Prisma.InvoiceWhereInput = {
    orgId: ctx.orgId,
    periodStart: { gte: window.startDate, lte: window.endDate },
  };
  const allocationWhere: Prisma.AllocationWhereInput = {
    receipt: {
      orgId: ctx.orgId,
      receivedAt: { gte: window.startDate, lte: window.endDate },
    },
  };
  const ledgerWhere: Prisma.TrustLedgerEntryWhereInput = {
    trustAccount: { orgId: ctx.orgId },
    occurredAt: { gte: window.startDate, lte: window.endDate },
  };

  if (scope.type === 'PROPERTY' && scope.id) {
    invoiceWhere.lease = { unit: { propertyId: scope.id } };
    allocationWhere.receipt = {
      ...(allocationWhere.receipt as Prisma.PaymentReceiptWhereInput),
      lease: { unit: { propertyId: scope.id } },
    };
    ledgerWhere.lease = { unit: { propertyId: scope.id } };
  }

  if (scope.type === 'LANDLORD' && scope.id) {
    invoiceWhere.lease = { unit: { property: { landlordId: scope.id } } };
    allocationWhere.receipt = {
      ...(allocationWhere.receipt as Prisma.PaymentReceiptWhereInput),
      lease: { unit: { property: { landlordId: scope.id } } },
    };
    ledgerWhere.landlordId = scope.id;
  }

  const [invoices, allocations, ledgerEntries] = await Promise.all([
    db.invoice.findMany({
      where: invoiceWhere,
      orderBy: [{ periodStart: 'asc' }, { id: 'asc' }],
      select: { id: true, totalCents: true, amountCents: true, paidAmountCents: true, status: true },
    }),
    db.allocation.findMany({
      where: allocationWhere,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, amountCents: true, target: true, reversedAt: true },
    }),
    db.trustLedgerEntry.findMany({
      where: ledgerWhere,
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      select: { id: true, amountCents: true, type: true },
    }),
  ]);

  const summary = {
    scopeType: scope.type,
    scopeId: scope.id ?? null,
    period: {
      startDate: year.startDate.toISOString(),
      endDate: year.endDate.toISOString(),
    },
    totals: {
      invoicesCents: invoices.reduce(
        (total, invoice) => total + (invoice.totalCents > 0 ? invoice.totalCents : invoice.amountCents),
        0,
      ),
      invoicePaidCents: invoices.reduce((total, invoice) => total + (invoice.paidAmountCents ?? 0), 0),
      allocationsCents: allocations.reduce((total, allocation) => total + allocation.amountCents, 0),
      ledgerNetCents: sum(ledgerEntries),
    },
    counts: {
      invoices: invoices.length,
      allocations: allocations.length,
      ledgerEntries: ledgerEntries.length,
    },
    buckets: {
      paidInvoices: invoices.filter((invoice) => invoice.status === 'PAID').length,
      overdueInvoices: invoices.filter((invoice) => invoice.status === 'OVERDUE').length,
      receiptAllocations: allocations.filter((allocation) => allocation.target === 'INVOICE_LINE_ITEM').length,
      depositAllocations: allocations.filter((allocation) => allocation.target === 'DEPOSIT').length,
      reversedAllocations: allocations.filter((allocation) => allocation.reversedAt).length,
      depositEntries: ledgerEntries.filter((entry) => entry.type === 'DEPOSIT_IN' || entry.type === 'DEPOSIT_OUT').length,
    },
  } satisfies Prisma.InputJsonObject;

  return summary;
}

export async function openYear(
  ctx: RouteCtx,
  input: { startDate: Date },
): Promise<FinancialYear> {
  const startDate = ensureUtcDate(input.startDate);
  if (!matchesFinancialYearStart(startDate)) {
    throw ApiError.badRequest('Financial year must start on March 1');
  }

  const resolved = resolveFinancialYearForDate(startDate);
  if (resolved.startDate.getTime() !== startDate.getTime()) {
    throw ApiError.badRequest('Start date does not align with the configured financial year');
  }

  const existing = await db.financialYear.findFirst({
    where: { orgId: ctx.orgId, startDate },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict('Financial year already exists');
  }

  const year = await db.financialYear.create({
    data: {
      orgId: ctx.orgId,
      startDate,
      endDate: ensureUtcDate(resolved.endDate),
    },
  });

  await writeAudit(ctx, {
    entityType: 'FinancialYear',
    entityId: year.id,
    action: 'OPEN',
    payload: {
      startDate: year.startDate.toISOString(),
      endDate: year.endDate.toISOString(),
    },
  });

  return year;
}

export async function getYearOrThrow(ctx: RouteCtx, yearId: string): Promise<FinancialYear> {
  const year = await db.financialYear.findFirst({
    where: { id: yearId, orgId: ctx.orgId },
  });
  if (!year) throw ApiError.notFound('Financial year not found');
  return year;
}

export async function listYears(ctx: RouteCtx): Promise<FinancialYear[]> {
  return db.financialYear.findMany({
    where: { orgId: ctx.orgId },
    orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
  });
}

export async function lockYear(ctx: RouteCtx, yearId: string): Promise<FinancialYear> {
  const year = await getYearOrThrow(ctx, yearId);
  const now = new Date();
  const yearEnd = endOfDay(year.endDate);
  if (yearEnd.getTime() > now.getTime()) {
    throw ApiError.badRequest('Cannot lock a year that has not ended');
  }
  if (year.lockedAt) return year;

  const updated = await db.financialYear.update({
    where: { id: year.id },
    data: { lockedAt: now, lockedById: ctx.user?.id ?? ctx.userId },
  });

  await writeAudit(ctx, {
    entityType: 'FinancialYear',
    entityId: updated.id,
    action: 'LOCK',
    payload: { lockedAt: updated.lockedAt?.toISOString() ?? null },
  });

  return updated;
}

export async function unlockYearForRegeneration(_ctx: RouteCtx, _yearId: string): Promise<never> {
  throw ApiError.forbidden('Locked years cannot be unlocked; use regenerateTaxPackPdf instead');
}

export async function generateAnnualReconciliation(
  ctx: RouteCtx,
  yearId: string,
  scope: YearScope,
): Promise<AnnualReconciliation> {
  await assertScopeAccess(ctx, scope);
  const year = await getYearOrThrow(ctx, yearId);
  const summary = await buildSummary(ctx, year, scope);

  const existing = await db.annualReconciliation.findFirst({
    where: {
      orgId: ctx.orgId,
      yearId,
      scopeType: scope.type,
      scopeId: scope.id ?? null,
    },
  });

  const row = existing
    ? await db.annualReconciliation.update({
        where: { id: existing.id },
        data: { summary, generatedAt: new Date() },
      })
    : await db.annualReconciliation.create({
        data: {
          orgId: ctx.orgId,
          yearId,
          scopeType: scope.type,
          scopeId: scope.id ?? null,
          summary,
        },
      });

  await writeAudit(ctx, {
    entityType: 'AnnualReconciliation',
    entityId: row.id,
    action: existing ? 'REGENERATE' : 'GENERATE',
    payload: {
      yearId,
      scopeType: scope.type,
      scopeId: scope.id ?? null,
    },
  });

  return row;
}
