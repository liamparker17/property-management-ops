import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';

async function getLandlordByUserId(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { landlordId: true, orgId: true },
  });
  if (!user?.landlordId) throw ApiError.notFound('No landlord record linked to this account');
  return { landlordId: user.landlordId, orgId: user.orgId };
}

export async function getLandlordProfile(userId: string) {
  const { landlordId } = await getLandlordByUserId(userId);
  const landlord = await db.landlord.findUnique({ where: { id: landlordId } });
  if (!landlord) throw ApiError.notFound('Landlord not found');
  return landlord;
}

export async function listLandlordProperties(userId: string) {
  const { landlordId } = await getLandlordByUserId(userId);
  return db.property.findMany({
    where: { landlordId, deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      addressLine1: true,
      suburb: true,
      city: true,
      province: true,
      assignedAgent: { select: { id: true, name: true } },
      _count: { select: { units: true } },
    },
  });
}

export async function getLandlordPortfolioSummary(userId: string) {
  const { landlordId, orgId } = await getLandlordByUserId(userId);
  const [propertyCount, unitCount, activeLeaseCount, openMaintenance] = await Promise.all([
    db.property.count({ where: { landlordId, deletedAt: null } }),
    db.unit.count({ where: { property: { landlordId, deletedAt: null } } }),
    db.lease.count({
      where: {
        orgId,
        state: 'ACTIVE',
        unit: { property: { landlordId } },
      },
    }),
    db.maintenanceRequest.count({
      where: {
        orgId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        unit: { property: { landlordId } },
      },
    }),
  ]);
  return { propertyCount, unitCount, activeLeaseCount, openMaintenance };
}
