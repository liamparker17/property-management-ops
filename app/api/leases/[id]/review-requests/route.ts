import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';
import { createReviewRequest } from '@/lib/services/signatures';
import { createReviewRequestSchema } from '@/lib/zod/signature';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw ApiError.unauthorized();
    if (session.user.role !== 'TENANT') throw ApiError.forbidden('Only tenants can open review requests');
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = createReviewRequestSchema.parse(body);
    const row = await createReviewRequest(session.user.id, id, parsed);
    return NextResponse.json({ data: row });
  } catch (err) {
    return toErrorResponse(err);
  }
}
