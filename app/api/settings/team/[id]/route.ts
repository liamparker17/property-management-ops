import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { updateUserSchema } from '@/lib/zod/team';
import { updateTeamUser } from '@/lib/services/team';

type Params = { id: string };

export const PATCH = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = updateUserSchema.parse(await req.json());
    const row = await updateTeamUser(ctx, id, input);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN'] },
);
