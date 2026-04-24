import type { InspectionStatus } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { listUpcomingOutages } from '@/lib/services/outages';
import { withTenantLeaseFilter } from '@/lib/services/role-scope';

export type TenantHomeView = {
  activeLease: {
    id: string;
    propertyName: string;
    unitLabel: string;
  } | null;
  nextInvoice: {
    id: string;
    totalCents: number;
    dueDate: Date;
  } | null;
  openInvoices: number;
  openTickets: number;
  pendingInspections: number;
  unreadNoticeCount: number;
  nextOutage: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    stage: number | null;
    source: string;
  } | null;
};

export type TenantNextAction =
  | { kind: 'PAY_INVOICE'; href: string; label: string }
  | { kind: 'SIGN_INSPECTION'; href: string; label: string }
  | { kind: 'READ_NOTICE'; href: string; label: string }
  | { kind: 'NONE'; href?: undefined; label?: undefined };

function requireTenant(ctx: RouteCtx) {
  if (ctx.role !== 'TENANT') {
    throw new Error('Tenant analytics require tenant role');
  }
}

async function getTenantNotificationIds(ctx: RouteCtx) {
  return db.notification.findMany({
    where: {
      orgId: ctx.orgId,
      userId: ctx.user?.id ?? ctx.userId,
      type: 'AREA_NOTICE',
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, readAt: true, payload: true },
  });
}

export async function getTenantHomeView(ctx: RouteCtx): Promise<TenantHomeView> {
  requireTenant(ctx);

  const [lease, invoices, maintenanceCount, inspections, notifications, outages] = await Promise.all([
    db.lease.findFirst({
      where: withTenantLeaseFilter(ctx, {
        state: { in: ['ACTIVE', 'RENEWED'] },
      }),
      orderBy: { startDate: 'desc' },
      include: {
        unit: { include: { property: { select: { name: true } } } },
      },
    }),
    db.invoice.findMany({
      where: {
        orgId: ctx.orgId,
        paidAt: null,
        lease: withTenantLeaseFilter(ctx),
      },
      orderBy: { dueDate: 'asc' },
      select: { id: true, totalCents: true, amountCents: true, dueDate: true },
    }),
    db.maintenanceRequest.count({
      where: {
        orgId: ctx.orgId,
        tenant: { userId: ctx.user?.id ?? ctx.userId },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    }),
    db.inspection.findMany({
      where: {
        orgId: ctx.orgId,
        lease: withTenantLeaseFilter(ctx),
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] as InspectionStatus[] },
      },
      orderBy: { scheduledAt: 'asc' },
      select: { id: true, status: true },
    }),
    getTenantNotificationIds(ctx),
    listUpcomingOutages(ctx, {}),
  ]);

  return {
    activeLease: lease
      ? {
          id: lease.id,
          propertyName: lease.unit.property.name,
          unitLabel: lease.unit.label,
        }
      : null,
    nextInvoice: invoices[0]
      ? {
          id: invoices[0].id,
          totalCents: invoices[0].totalCents > 0 ? invoices[0].totalCents : invoices[0].amountCents,
          dueDate: invoices[0].dueDate,
        }
      : null,
    openInvoices: invoices.length,
    openTickets: maintenanceCount,
    pendingInspections: inspections.length,
    unreadNoticeCount: notifications.filter((row) => !row.readAt).length,
    nextOutage: outages[0]
      ? {
          id: outages[0].id,
          startsAt: outages[0].startsAt,
          endsAt: outages[0].endsAt,
          stage: outages[0].stage,
          source: outages[0].source,
        }
      : null,
  };
}

export async function getTenantNextAction(ctx: RouteCtx): Promise<TenantNextAction> {
  requireTenant(ctx);

  const [invoice, inspection, notice] = await Promise.all([
    db.invoice.findFirst({
      where: {
        orgId: ctx.orgId,
        paidAt: null,
        lease: withTenantLeaseFilter(ctx),
      },
      orderBy: { dueDate: 'asc' },
      select: { id: true },
    }),
    db.inspection.findFirst({
      where: {
        orgId: ctx.orgId,
        lease: withTenantLeaseFilter(ctx),
        status: { in: ['COMPLETED', 'SCHEDULED', 'IN_PROGRESS'] },
      },
      orderBy: { scheduledAt: 'asc' },
      select: { id: true },
    }),
    db.notification.findFirst({
      where: {
        orgId: ctx.orgId,
        userId: ctx.user?.id ?? ctx.userId,
        type: 'AREA_NOTICE',
        readAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
  ]);

  if (invoice) {
    return {
      kind: 'PAY_INVOICE',
      href: `/tenant/invoices/${invoice.id}`,
      label: 'Pay your next invoice',
    };
  }

  if (inspection) {
    return {
      kind: 'SIGN_INSPECTION',
      href: `/tenant/inspections/${inspection.id}`,
      label: 'Review your inspection',
    };
  }

  if (notice) {
    return {
      kind: 'READ_NOTICE',
      href: `/tenant/notices/${notice.id}`,
      label: 'Read the latest notice',
    };
  }

  return { kind: 'NONE' };
}
