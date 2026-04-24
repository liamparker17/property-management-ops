import type { Prisma } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';

export function withRoleScopeFilter(
  ctx: RouteCtx,
  propertyClause: Prisma.PropertyWhereInput = {},
): Prisma.PropertyWhereInput {
  const user = ctx.user;
  if (ctx.role === 'TENANT') {
    throw ApiError.forbidden('Tenant users must use tenant-scoped helpers');
  }

  if (ctx.role === 'LANDLORD') {
    if (!user?.landlordId) throw ApiError.forbidden('No landlord record linked to this account');
    return { AND: [propertyClause, { landlordId: user.landlordId }] };
  }

  if (ctx.role === 'MANAGING_AGENT') {
    if (!user?.managingAgentId) throw ApiError.forbidden('No managing-agent record linked to this account');
    return { AND: [propertyClause, { assignedAgentId: user.managingAgentId }] };
  }

  return propertyClause;
}

export function withTenantLeaseFilter(
  ctx: RouteCtx,
  leaseClause: Prisma.LeaseWhereInput = {},
): Prisma.LeaseWhereInput {
  if (ctx.role === 'TENANT') {
    if (!ctx.user?.id) throw ApiError.forbidden('No tenant user linked to this account');
    return {
      AND: [
        leaseClause,
        {
          tenants: {
            some: {
              tenant: {
                userId: ctx.user.id,
              },
            },
          },
        },
      ],
    };
  }

  if (ctx.role === 'LANDLORD' || ctx.role === 'MANAGING_AGENT') {
    return {
      AND: [
        leaseClause,
        {
          unit: {
            property: withRoleScopeFilter(ctx),
          },
        },
      ],
    };
  }

  return leaseClause;
}

export async function assertCanReadProperty(ctx: RouteCtx, propertyId: string): Promise<void> {
  if (ctx.role === 'TENANT') {
    if (!ctx.user?.id) throw ApiError.forbidden();
    const link = await db.leaseTenant.findFirst({
      where: {
        tenant: { userId: ctx.user.id },
        lease: { unit: { propertyId } },
      },
      select: { leaseId: true },
    });
    if (!link) throw ApiError.forbidden();
    return;
  }

  const property = await db.property.findFirst({
    where: withRoleScopeFilter(ctx, { id: propertyId, deletedAt: null }),
    select: { id: true },
  });

  if (!property) throw ApiError.forbidden();
}
