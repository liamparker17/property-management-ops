import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { changePasswordSchema } from '@/lib/zod/team';
import { changeOwnPassword } from '@/lib/services/team';

export const POST = withOrg(async (req, ctx) => {
  const input = changePasswordSchema.parse(await req.json());
  return NextResponse.json({ data: await changeOwnPassword(ctx, input) });
});
