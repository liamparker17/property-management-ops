import type { ChartPoint } from '@/components/analytics/charts/area-chart';
import type { PortfolioPin } from '@/components/analytics/maps/portfolio-pins';
import type { KpiId } from '@/lib/analytics/kpis';
import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { withRoleScopeFilter } from '@/lib/services/role-scope';
import { monthFloor, recomputeAgentSnapshot } from '@/lib/services/snapshots';

type AgentKpiMap = Record<
  Extract<KpiId, 'AGENT_OPEN_TICKETS' | 'BLOCKED_APPROVALS' | 'AGENT_UPCOMING_INSPECTIONS'>,
  number
>;

export type AgentQueueRow = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

export type AgentCommandCenter = {
  periodStart: Date;
  kpis: AgentKpiMap;
  priorKpis: Partial<AgentKpiMap>;
  ticketQueue: AgentQueueRow[];
  inspectionQueue: AgentQueueRow[];
  pins: PortfolioPin[];
};

function addMonths(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function requireAgentId(ctx: RouteCtx) {
  if (!ctx.user?.managingAgentId) {
    throw new Error('Agent analytics require ctx.user.managingAgentId');
  }
  return ctx.user.managingAgentId;
}

function buildPins(properties: { id: string; name: string; suburb: string; city: string }[]) {
  return properties.map((property, index) => ({
    id: property.id,
    label: property.name,
    lat: -26.2041 + index * 0.01,
    lng: 28.0473 + index * 0.01,
    href: `/agent/properties/${property.id}`,
    meta: `${property.suburb}, ${property.city}`,
  }));
}

export async function getAgentCommandCenter(ctx: RouteCtx): Promise<AgentCommandCenter> {
  const agentId = requireAgentId(ctx);
  const periodStart = monthFloor(new Date());
  const priorPeriodStart = addMonths(periodStart, -1);
  const propertyIds = (
    await db.property.findMany({
      where: withRoleScopeFilter(ctx, { deletedAt: null }),
      select: { id: true },
    })
  ).map((row) => row.id);
  let currentSnapshotRow = await db.agentMonthlySnapshot.findFirst({
    where: { orgId: ctx.orgId, agentId, periodStart },
  });
  if (!currentSnapshotRow) {
    try {
      currentSnapshotRow = await recomputeAgentSnapshot(ctx, agentId, periodStart);
    } catch (err) {
      console.error('[agent-analytics] lazy hydrate failed', err);
    }
  }
  const [currentSnapshot, priorSnapshot, properties, tickets, inspections, blockedApprovals] = await Promise.all([
    Promise.resolve(currentSnapshotRow),
    db.agentMonthlySnapshot.findFirst({ where: { orgId: ctx.orgId, agentId, periodStart: priorPeriodStart } }),
    db.property.findMany({
      where: withRoleScopeFilter(ctx, { deletedAt: null }),
      orderBy: { name: 'asc' },
      select: { id: true, name: true, suburb: true, city: true },
    }),
    db.maintenanceRequest.findMany({
      where: {
        orgId: ctx.orgId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        unit: { property: withRoleScopeFilter(ctx, { deletedAt: null }) },
      },
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
      include: { unit: { include: { property: { select: { name: true } } } } },
      take: 8,
    }),
    db.inspection.findMany({
      where: {
        orgId: ctx.orgId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
        unit: { property: withRoleScopeFilter(ctx, { deletedAt: null }) },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { unit: { include: { property: { select: { name: true } } } } },
      take: 8,
    }),
    db.approval.count({
      where: {
        orgId: ctx.orgId,
        state: 'PENDING',
        ...(propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : {}),
      },
    }),
  ]);

  return {
    periodStart,
    kpis: {
      AGENT_OPEN_TICKETS: currentSnapshot?.openTickets ?? tickets.length,
      BLOCKED_APPROVALS: currentSnapshot?.blockedApprovals ?? blockedApprovals,
      AGENT_UPCOMING_INSPECTIONS: currentSnapshot?.upcomingInspections ?? inspections.length,
    },
    priorKpis: {
      AGENT_OPEN_TICKETS: priorSnapshot?.openTickets ?? 0,
      BLOCKED_APPROVALS: priorSnapshot?.blockedApprovals ?? 0,
      AGENT_UPCOMING_INSPECTIONS: priorSnapshot?.upcomingInspections ?? 0,
    },
    ticketQueue: tickets.map((row) => ({
      id: row.id,
      label: row.title,
      detail: `${row.unit.property.name} / ${row.unit.label}`,
      href: `/agent/maintenance/${row.id}`,
    })),
    inspectionQueue: inspections.map((row) => ({
      id: row.id,
      label: `${row.unit.property.name} / ${row.unit.label}`,
      detail: `${row.type.replace('_', ' ')} · ${row.scheduledAt.toISOString().slice(0, 10)}`,
      href: `/agent/inspections`,
    })),
    pins: buildPins(properties),
  };
}

export async function getAgentPortfolio(ctx: RouteCtx) {
  const properties = await db.property.findMany({
    where: withRoleScopeFilter(ctx, { deletedAt: null }),
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      suburb: true,
      city: true,
      units: { select: { id: true } },
    },
  });
  return {
    rows: properties.map((property) => ({
      id: property.id,
      name: property.name,
      suburb: property.suburb,
      city: property.city,
      unitCount: property.units.length,
      href: `/agent/properties/${property.id}`,
    })),
    pins: buildPins(properties),
  };
}

export async function getAgentMaintenanceQueue(ctx: RouteCtx) {
  const rows = await db.maintenanceRequest.findMany({
    where: {
      orgId: ctx.orgId,
      unit: { property: withRoleScopeFilter(ctx, { deletedAt: null }) },
    },
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
    include: {
      unit: { include: { property: { select: { name: true } } } },
      vendor: { select: { name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    propertyName: row.unit.property.name,
    unitLabel: row.unit.label,
    status: row.status,
    priority: row.priority,
    scheduledFor: row.scheduledFor,
    vendorName: row.vendor?.name ?? null,
    href: `/agent/maintenance/${row.id}`,
  }));
}

export async function getAgentInspectionQueue(ctx: RouteCtx) {
  const rows = await db.inspection.findMany({
    where: {
      orgId: ctx.orgId,
      unit: { property: withRoleScopeFilter(ctx, { deletedAt: null }) },
      status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      unit: { include: { property: { select: { name: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    propertyName: row.unit.property.name,
    unitLabel: row.unit.label,
    type: row.type,
    status: row.status,
    scheduledAt: row.scheduledAt,
  }));
}
