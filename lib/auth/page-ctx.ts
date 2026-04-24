import type { Role } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';

type SessionUserLike = {
  id: string;
  orgId: string;
  role: Role;
  landlordId?: string | null;
  managingAgentId?: string | null;
  smsOptIn?: boolean | null;
};

export function userToRouteCtx(user: SessionUserLike): RouteCtx {
  return {
    orgId: user.orgId,
    userId: user.id,
    role: user.role,
    user: {
      id: user.id,
      orgId: user.orgId,
      role: user.role,
      landlordId: user.landlordId ?? null,
      managingAgentId: user.managingAgentId ?? null,
      smsOptIn: user.smsOptIn ?? false,
    },
  };
}
