import { db } from '@/lib/db';
import { createNotification } from '@/lib/services/notifications';

function cronCtx(orgId: string) {
  return {
    orgId,
    userId: 'cron',
    role: 'ADMIN' as const,
    user: {
      id: 'cron',
      orgId,
      role: 'ADMIN' as const,
      landlordId: null,
      managingAgentId: null,
      smsOptIn: false,
    },
  };
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

export async function evaluatePaymentAlerts(orgId: string) {
  const now = new Date();
  const invoices = await db.invoice.findMany({
    where: {
      orgId,
      status: { in: ['DUE', 'OVERDUE'] },
      paidAt: null,
    },
    include: {
      lease: {
        include: {
          unit: { include: { property: { select: { name: true } } } },
          tenants: {
            where: { isPrimary: true },
            include: {
              tenant: { select: { id: true, userId: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  let reminded = 0;
  let overdueFlagged = 0;
  let finalNoticed = 0;

  for (const invoice of invoices) {
    const tenant = invoice.lease.tenants[0]?.tenant;
    if (!tenant?.userId) continue;

    const daysUntilDue = daysBetween(invoice.dueDate, now);
    let type: 'PAYMENT_REMINDER' | 'PAYMENT_OVERDUE' | 'PAYMENT_FINAL' | null = null;
    if (daysUntilDue === 7) type = 'PAYMENT_REMINDER';
    else if (daysUntilDue === -14) type = 'PAYMENT_OVERDUE';
    else if (daysUntilDue === -30) type = 'PAYMENT_FINAL';

    if (!type) continue;

    const existing = await db.notification.findFirst({
      where: {
        orgId,
        entityType: 'Invoice',
        entityId: invoice.id,
        type,
        userId: tenant.userId,
      },
      select: { id: true },
    });
    if (existing) continue;

    await createNotification(cronCtx(orgId), {
      userId: tenant.userId,
      role: 'TENANT',
      type,
      subject:
        type === 'PAYMENT_REMINDER'
          ? 'Invoice due soon'
          : type === 'PAYMENT_OVERDUE'
            ? 'Invoice overdue'
            : 'Final payment notice',
      body: `${tenant.firstName} ${tenant.lastName}, invoice for ${invoice.lease.unit.property.name} is awaiting payment.`,
      payload: { invoiceId: invoice.id, dueDate: invoice.dueDate.toISOString() },
      entityType: 'Invoice',
      entityId: invoice.id,
    });

    if (type === 'PAYMENT_REMINDER') reminded += 1;
    else if (type === 'PAYMENT_OVERDUE') overdueFlagged += 1;
    else finalNoticed += 1;
  }

  return { reminded, overdueFlagged, finalNoticed };
}
