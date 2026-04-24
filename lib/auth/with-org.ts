import type { NextRequest, NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';

export type RouteCtx = {
  orgId: string;
  userId: string;
  role: Role;
  user?: {
    id: string;
    orgId: string;
    role: Role;
    landlordId?: string | null;
    managingAgentId?: string | null;
    smsOptIn?: boolean;
  };
};

type Handler<P> = (
  req: NextRequest,
  ctx: RouteCtx,
  params: P,
) => Promise<NextResponse> | NextResponse;

type RouteParams<P> = { params: Promise<P> };

export function withOrg<P = Record<string, string>>(
  handler: Handler<P>,
  opts?: { requireRole?: Role[] },
) {
  return async (req: NextRequest, routeParams: RouteParams<P>) => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiError.unauthorized();
      if (opts?.requireRole && !opts.requireRole.includes(session.user.role)) {
        throw ApiError.forbidden();
      }
      const ctx: RouteCtx = {
        orgId: session.user.orgId,
        userId: session.user.id,
        role: session.user.role,
        user: {
          id: session.user.id,
          orgId: session.user.orgId,
          role: session.user.role,
          landlordId: session.user.landlordId ?? null,
          managingAgentId: session.user.managingAgentId ?? null,
          smsOptIn: session.user.smsOptIn ?? false,
        },
      };
      const params = (await routeParams.params) as P;
      return await handler(req, ctx, params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
