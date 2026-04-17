import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';
import { signLeaseAsTenant } from '@/lib/services/signatures';
import { signLeaseSchema } from '@/lib/zod/signature';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw ApiError.unauthorized();
    if (session.user.role !== 'TENANT') throw ApiError.forbidden('Only tenants can sign');
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = signLeaseSchema.parse(body);
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      null;
    const ua = req.headers.get('user-agent');
    const row = await signLeaseAsTenant(session.user.id, id, parsed, { ipAddress: ip, userAgent: ua });
    return NextResponse.json({ data: row });
  } catch (err) {
    return toErrorResponse(err);
  }
}
