import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { createUserSchema } from '@/lib/zod/team';
import { listTeam, createTeamUser } from '@/lib/services/team';

export const GET = withOrg(
  async (_req, ctx) => NextResponse.json({ data: await listTeam(ctx) }),
  { requireRole: ['ADMIN'] },
);

export const POST = withOrg(
  async (req, ctx) => {
    const input = createUserSchema.parse(await req.json());
    const row = await createTeamUser(ctx, input);
    return NextResponse.json({ data: row }, { status: 201 });
  },
  { requireRole: ['ADMIN'] },
);
