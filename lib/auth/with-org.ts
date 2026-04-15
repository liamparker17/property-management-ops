import type { NextRequest, NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';

export type RouteCtx = {
  orgId: string;
  userId: string;
  role: Role;
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
      };
      const params = (await routeParams.params) as P;
      return await handler(req, ctx, params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
