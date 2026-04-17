import { InvoiceStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { formatZar } from '@/lib/format';
import { sendInvoicePaidTenantSms } from '@/lib/sms';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type { markInvoicePaidSchema } from '@/lib/zod/invoice';

function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
}

export async function ensureInvoicesForLease(leaseId: string): Promise<void> {
  const lease = await db.lease.findUnique({
    where: { id: leaseId },
    select: {
      id: true,
      orgId: true,
      startDate: true,
      endDate: true,
      rentAmountCents: true,
      paymentDueDay: true,
      state: true,
    },
  });
  if (!lease) return;
  if (lease.state !== 'ACTIVE' && lease.state !== 'RENEWED') return;

  const today = new Date();
  const firstPeriod = monthStart(lease.startDate);
  const lastPeriod = monthStart(addMonths(today, 1));
  const leaseEnd = monthStart(lease.endDate);
  const cap = lastPeriod < leaseEnd ? lastPeriod : leaseEnd;

  const existing = await db.invoice.findMany({
    where: { leaseId },
    select: { periodStart: true },
  });
  const seen = new Set(existing.map((e) => e.periodStart.toISOString().slice(0, 10)));

  const toCreate: Array<{ periodStart: Date; dueDate: Date }> = [];
  for (let p = firstPeriod; p <= cap; p = addMonths(p, 1)) {
    const key = p.toISOString().slice(0, 10);
    if (seen.has(key)) continue;
    const dueDay = Math.min(lease.paymentDueDay || 1, 28);
    const due = new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), dueDay));
    toCreate.push({ periodStart: new Date(p), dueDate: due });
  }
  if (toCreate.length === 0) return;

  const currentMonth = monthStart(today);
  await db.invoice.createMany({
    data: toCreate.map((t) => ({
      orgId: lease.orgId,
      leaseId,
      periodStart: t.periodStart,
      dueDate: t.dueDate,
      amountCents: lease.rentAmountCents,
      status: t.periodStart < currentMonth ? InvoiceStatus.PAID : InvoiceStatus.DUE,
      paidAt: t.periodStart < currentMonth ? t.dueDate : null,
      paidAmountCents: t.periodStart < currentMonth ? lease.rentAmountCents : null,
    })),
    skipDuplicates: true,
  });
}

async function getTenantForUser(userId: string) {
  const tenant = await db.tenant.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!tenant) throw ApiError.notFound('Tenant profile not found');
  return tenant;
}

export async function listTenantInvoices(userId: string) {
  const tenant = await getTenantForUser(userId);
  const leases = await db.leaseTenant.findMany({
    where: { tenantId: tenant.id, lease: { state: { in: ['ACTIVE', 'RENEWED'] } } },
    select: { leaseId: true },
  });
  for (const lt of leases) {
    await ensureInvoicesForLease(lt.leaseId);
  }
  const leaseIds = leases.map((l) => l.leaseId);
  if (leaseIds.length === 0) return [];

  return db.invoice.findMany({
    where: { leaseId: { in: leaseIds } },
    orderBy: { periodStart: 'desc' },
    include: {
      lease: { include: { unit: { include: { property: { select: { name: true } } } } } },
    },
  });
}

export async function listLeaseInvoices(ctx: RouteCtx, leaseId: string) {
  const lease = await db.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  await ensureInvoicesForLease(leaseId);
  return db.invoice.findMany({
    where: { leaseId },
    orderBy: { periodStart: 'desc' },
  });
}

export async function markInvoicePaid(
  ctx: RouteCtx,
  invoiceId: string,
  input: z.infer<typeof markInvoicePaidSchema>,
) {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, orgId: ctx.orgId },
    select: { id: true, amountCents: true, status: true },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  const wasAlreadyPaid = invoice.status === InvoiceStatus.PAID;
  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: InvoiceStatus.PAID,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      paidAmountCents: input.paidAmountCents ?? invoice.amountCents,
      paidNote: input.paidNote ?? null,
    },
    include: {
      lease: {
        select: {
          tenants: {
            where: { isPrimary: true },
            include: { tenant: { select: { firstName: true, lastName: true, phone: true } } },
          },
        },
      },
    },
  });

  if (!wasAlreadyPaid) {
    const primary = updated.lease.tenants[0]?.tenant;
    if (primary?.phone) {
      const periodLabel = updated.periodStart.toLocaleString('en-ZA', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
      await sendInvoicePaidTenantSms({
        to: primary.phone,
        tenantName: `${primary.firstName} ${primary.lastName}`.trim(),
        amountZar: formatZar(updated.paidAmountCents ?? updated.amountCents),
        periodLabel,
      });
    }
  }

  return updated;
}

export async function markInvoiceUnpaid(ctx: RouteCtx, invoiceId: string) {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return db.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.DUE, paidAt: null, paidAmountCents: null, paidNote: null },
  });
}
