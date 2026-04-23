import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { addApplicationNote } from '@/lib/services/applications';
import { addApplicationNoteSchema } from '@/lib/zod/application';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const input = addApplicationNoteSchema.parse(await req.json());
    return NextResponse.json({ data: await addApplicationNote(ctx, id, input.body) }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
