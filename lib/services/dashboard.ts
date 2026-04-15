import { db } from '@/lib/db';
import type { RouteCtx } from '@/lib/auth/with-org';
import { deriveStatus } from '@/lib/services/leases';
import { getUnitOccupancy } from '@/lib/services/units';

export async function getDashboardSummary(ctx: RouteCtx) {
  const org = await db.org.findUnique({
    where: { id: ctx.orgId },
    select: { expiringWindowDays: true },
  });
  const window = org?.expiringWindowDays ?? 60;
  const now = new Date();

  const [totalProperties, units] = await Promise.all([
    db.property.count({ where: { orgId: ctx.orgId, deletedAt: null } }),
    db.unit.findMany({
      where: { orgId: ctx.orgId, property: { deletedAt: null } },
      select: { id: true },
    }),
  ]);
  const totalUnits = units.length;

  const occupancies = await Promise.all(units.map((u) => getUnitOccupancy(u.id, ctx.orgId, now)));
  const occupiedUnits = occupancies.filter((o) => o.state === 'OCCUPIED').length;
  const vacantUnits = occupancies.filter((o) => o.state === 'VACANT').length;
  const upcomingUnits = occupancies.filter((o) => o.state === 'UPCOMING').length;
  const conflictUnits = occupancies.filter((o) => o.state === 'CONFLICT').length;

  const activeLeasesRaw = await db.lease.findMany({
    where: { orgId: ctx.orgId, state: 'ACTIVE' },
    select: { id: true, state: true, endDate: true },
  });
  const withStatus = activeLeasesRaw.map((l) => ({ id: l.id, status: deriveStatus(l, window, now) }));
  const activeLeases = withStatus.filter((l) => l.status === 'ACTIVE' || l.status === 'EXPIRING').length;
  const expiringSoonLeases = withStatus.filter((l) => l.status === 'EXPIRING').length;
  const expiredLeases = withStatus.filter((l) => l.status === 'EXPIRED').length;

  const [recentLeases, expiringList] = await Promise.all([
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
  ]);

  const expiringSoonList = expiringList
    .map((l) => ({ ...l, status: deriveStatus(l, window, now) }))
    .filter((l) => l.status === 'EXPIRING')
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .slice(0, 10)
    .map((l) => {
      const primary = l.tenants[0]?.tenant;
      const daysUntil = Math.ceil((l.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: l.id,
        unitLabel: l.unit.label,
        propertyName: l.unit.property.name,
        primaryTenantName: primary ? `${primary.firstName} ${primary.lastName}` : null,
        endDate: l.endDate.toISOString().slice(0, 10),
        daysUntilExpiry: daysUntil,
      };
    });

  return {
    totalProperties,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    upcomingUnits,
    conflictUnits,
    activeLeases,
    expiringSoonLeases,
    expiredLeases,
    recentLeases: recentLeases.map((l) => ({
      id: l.id,
      unitLabel: l.unit.label,
      propertyName: l.unit.property.name,
      primaryTenantName: l.tenants[0]
        ? `${l.tenants[0].tenant.firstName} ${l.tenants[0].tenant.lastName}`
        : null,
      startDate: l.startDate.toISOString().slice(0, 10),
      endDate: l.endDate.toISOString().slice(0, 10),
      state: l.state,
    })),
    expiringSoonList,
  };
}
