import type { InvoiceStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ensureInvoicesForLease } from '@/lib/services/invoices';
import { deriveStatus } from '@/lib/services/leases';
import { getUnitOccupancy } from '@/lib/services/units';

function monthStartUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleString('en-ZA', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function effectiveInvoiceStatus(
  invoice: { status: InvoiceStatus; dueDate: Date; paidAt: Date | null },
  now: Date,
): 'PAID' | 'DUE' | 'OVERDUE' {
  if (invoice.status === 'PAID' || invoice.paidAt) return 'PAID';
  return invoice.dueDate.getTime() < now.getTime() ? 'OVERDUE' : 'DUE';
}

export async function getDashboardSummary(ctx: RouteCtx) {
  const org = await db.org.findUnique({
    where: { id: ctx.orgId },
    select: { expiringWindowDays: true },
  });
  const window = org?.expiringWindowDays ?? 60;
  const now = new Date();
  const currentMonth = monthStartUtc(now);
  const trailingMonths = Array.from({ length: 6 }, (_, index) => addUtcMonths(currentMonth, index - 5));
  const trailingMonthKeys = new Set(trailingMonths.map(monthKey));

  const [totalProperties, units, activeLeaseIds] = await Promise.all([
    db.property.count({ where: { orgId: ctx.orgId, deletedAt: null } }),
    db.unit.findMany({
      where: { orgId: ctx.orgId, property: { deletedAt: null } },
      select: { id: true },
    }),
    db.lease.findMany({
      where: { orgId: ctx.orgId, state: { in: ['ACTIVE', 'RENEWED'] } },
      select: { id: true },
    }),
  ]);

  await Promise.all(activeLeaseIds.map((lease) => ensureInvoicesForLease(lease.id)));

  const totalUnits = units.length;
  const occupancies = await Promise.all(units.map((unit) => getUnitOccupancy(unit.id, ctx.orgId, now)));
  const occupiedUnits = occupancies.filter((occupancy) => occupancy.state === 'OCCUPIED').length;
  const vacantUnits = occupancies.filter((occupancy) => occupancy.state === 'VACANT').length;
  const upcomingUnits = occupancies.filter((occupancy) => occupancy.state === 'UPCOMING').length;
  const conflictUnits = occupancies.filter((occupancy) => occupancy.state === 'CONFLICT').length;

  const activeLeasesRaw = await db.lease.findMany({
    where: { orgId: ctx.orgId, state: 'ACTIVE' },
    select: { id: true, state: true, endDate: true },
  });
  const withStatus = activeLeasesRaw.map((lease) => ({ id: lease.id, status: deriveStatus(lease, window, now) }));
  const activeLeases = withStatus.filter((lease) => lease.status === 'ACTIVE' || lease.status === 'EXPIRING').length;
  const expiringSoonLeases = withStatus.filter((lease) => lease.status === 'EXPIRING').length;
  const expiredLeases = withStatus.filter((lease) => lease.status === 'EXPIRED').length;

  const [recentLeases, expiringList, invoices] = await Promise.all([
    db.lease.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        unit: { include: { property: { select: { name: true } } } },
        tenants: {
          where: { isPrimary: true },
          include: { tenant: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    db.lease.findMany({
      where: { orgId: ctx.orgId, state: 'ACTIVE' },
      include: {
        unit: { include: { property: { select: { name: true } } } },
        tenants: {
          where: { isPrimary: true },
          include: { tenant: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    db.invoice.findMany({
      where: { orgId: ctx.orgId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: { select: { name: true } },
              },
            },
            tenants: {
              where: { isPrimary: true },
              include: {
                tenant: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const expiringSoonList = expiringList
    .map((lease) => ({ ...lease, status: deriveStatus(lease, window, now) }))
    .filter((lease) => lease.status === 'EXPIRING')
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(0, 10)
    .map((lease) => {
      const primary = lease.tenants[0]?.tenant;
      const daysUntil = Math.ceil((lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: lease.id,
        unitLabel: lease.unit.label,
        propertyName: lease.unit.property.name,
        primaryTenantName: primary ? `${primary.firstName} ${primary.lastName}` : null,
        endDate: lease.endDate.toISOString().slice(0, 10),
        daysUntilExpiry: daysUntil,
      };
    });

  const expiryBuckets = { critical: 0, month: 0, window: 0, later: 0 };
  for (const lease of expiringList) {
    const daysUntil = Math.ceil((lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 14) expiryBuckets.critical += 1;
    else if (daysUntil <= 30) expiryBuckets.month += 1;
    else if (daysUntil <= window) expiryBuckets.window += 1;
    else expiryBuckets.later += 1;
  }

  const monthlyTrend = trailingMonths.map((month) => ({
    label: monthLabel(month),
    key: monthKey(month),
    invoicedCents: 0,
    paidCents: 0,
  }));
  const trendByKey = new Map(monthlyTrend.map((bucket) => [bucket.key, bucket]));
  const unitCashflowMap = new Map<
    string,
    {
      unitId: string;
      leaseId: string;
      propertyName: string;
      unitLabel: string;
      invoicedCents: number;
      paidCents: number;
      outstandingCents: number;
    }
  >();

  let totalInvoicedCents = 0;
  let totalCollectedCents = 0;
  let paidAmountCents = 0;
  let dueAmountCents = 0;
  let overdueAmountCents = 0;
  let paidCount = 0;
  let dueCount = 0;
  let overdueCount = 0;

  const overdueAccounts = invoices
    .filter((invoice) => effectiveInvoiceStatus(invoice, now) === 'OVERDUE')
    .map((invoice) => {
      const primary = invoice.lease.tenants[0]?.tenant;
      const amountCents = invoice.paidAmountCents ?? invoice.amountCents;
      const daysOverdue = Math.ceil((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: invoice.id,
        leaseId: invoice.leaseId,
        unitId: invoice.lease.unit.id,
        propertyName: invoice.lease.unit.property.name,
        unitLabel: invoice.lease.unit.label,
        tenantName: primary ? `${primary.firstName} ${primary.lastName}` : null,
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
        amountCents,
        daysOverdue,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.amountCents - a.amountCents)
    .slice(0, 6);

  for (const invoice of invoices) {
    const status = effectiveInvoiceStatus(invoice, now);
    const effectiveAmount = invoice.paidAmountCents ?? invoice.amountCents;

    if (status === 'PAID') {
      paidAmountCents += effectiveAmount;
      paidCount += 1;
    } else if (status === 'OVERDUE') {
      overdueAmountCents += invoice.amountCents;
      overdueCount += 1;
    } else {
      dueAmountCents += invoice.amountCents;
      dueCount += 1;
    }

    const invoiceMonth = monthStartUtc(invoice.periodStart);
    const invoiceKey = monthKey(invoiceMonth);
    if (trailingMonthKeys.has(invoiceKey)) {
      totalInvoicedCents += invoice.amountCents;
      const bucket = trendByKey.get(invoiceKey);
      if (bucket) bucket.invoicedCents += invoice.amountCents;

      const unitKey = invoice.lease.unit.id;
      const unitBucket =
        unitCashflowMap.get(unitKey) ??
        {
          unitId: invoice.lease.unit.id,
          leaseId: invoice.lease.id,
          propertyName: invoice.lease.unit.property.name,
          unitLabel: invoice.lease.unit.label,
          invoicedCents: 0,
          paidCents: 0,
          outstandingCents: 0,
        };

      unitBucket.invoicedCents += invoice.amountCents;
      if (status === 'PAID') unitBucket.paidCents += effectiveAmount;
      else unitBucket.outstandingCents += invoice.amountCents;
      unitCashflowMap.set(unitKey, unitBucket);
    }

    if (invoice.paidAt) {
      const paidMonth = monthStartUtc(invoice.paidAt);
      const paidKey = monthKey(paidMonth);
      if (trailingMonthKeys.has(paidKey)) {
        totalCollectedCents += effectiveAmount;
        const bucket = trendByKey.get(paidKey);
        if (bucket) bucket.paidCents += effectiveAmount;
      }
    }
  }

  const collectionRatePct = totalInvoicedCents > 0 ? Math.round((totalCollectedCents / totalInvoicedCents) * 100) : 0;
  const outstandingCents = dueAmountCents + overdueAmountCents;

  const lineItems = await db.invoiceLineItem.findMany({
    where: { invoice: { orgId: ctx.orgId } },
    select: { kind: true, amountCents: true },
  });
  const incomeByKindMap = new Map<string, number>();
  for (const line of lineItems) {
    const bucket = line.kind === 'RENT' ? 'RENT' : line.kind.startsWith('UTILITY_') ? 'UTILITY' : 'OTHER';
    incomeByKindMap.set(bucket, (incomeByKindMap.get(bucket) ?? 0) + line.amountCents);
  }
  const incomeByKind = {
    rentCents: incomeByKindMap.get('RENT') ?? 0,
    utilityCents: incomeByKindMap.get('UTILITY') ?? 0,
    otherCents: incomeByKindMap.get('OTHER') ?? 0,
  };

  return {
    incomeByKind,
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    upcomingUnits,
    conflictUnits,
    activeLeases,
    expiringSoonLeases,
    expiredLeases,
    recentLeases: recentLeases.map((lease) => ({
      id: lease.id,
      unitLabel: lease.unit.label,
      propertyName: lease.unit.property.name,
      primaryTenantName: lease.tenants[0]
        ? `${lease.tenants[0].tenant.firstName} ${lease.tenants[0].tenant.lastName}`
        : null,
      startDate: lease.startDate.toISOString().slice(0, 10),
      endDate: lease.endDate.toISOString().slice(0, 10),
      state: lease.state,
    })),
    expiringSoonList,
    invoiceOverview: {
      totalInvoicedCents,
      totalCollectedCents,
      outstandingCents,
      overdueCount,
      overdueAmountCents,
      collectionRatePct,
      monthlyTrend: monthlyTrend.map(({ key, ...bucket }) => bucket),
      statusBreakdown: [
        { label: 'Paid', amountCents: paidAmountCents, count: paidCount, tone: 'emerald' as const },
        { label: 'Due', amountCents: dueAmountCents, count: dueCount, tone: 'amber' as const },
        { label: 'Overdue', amountCents: overdueAmountCents, count: overdueCount, tone: 'destructive' as const },
      ],
      cashflowByUnit: Array.from(unitCashflowMap.values())
        .sort((a, b) => b.invoicedCents - a.invoicedCents || b.paidCents - a.paidCents)
        .slice(0, 8)
        .map((unit) => ({
          ...unit,
          collectionRatePct:
            unit.invoicedCents > 0 ? Math.round((unit.paidCents / unit.invoicedCents) * 100) : 0,
        })),
      overdueAccounts,
    },
    expiryOverview: {
      buckets: [
        {
          label: '0-14 days',
          description: 'Immediate renewals',
          count: expiryBuckets.critical,
          tone: 'destructive' as const,
        },
        {
          label: '15-30 days',
          description: 'This month',
          count: expiryBuckets.month,
          tone: 'amber' as const,
        },
        {
          label: `31-${window} days`,
          description: 'Inside warning window',
          count: expiryBuckets.window,
          tone: 'primary' as const,
        },
        {
          label: `${window + 1}+ days`,
          description: 'Later expiries',
          count: expiryBuckets.later,
          tone: 'slate' as const,
        },
      ],
    },
  };
}
