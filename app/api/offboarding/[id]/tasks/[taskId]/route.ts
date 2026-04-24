import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { toggleOffboardingTask } from '@/lib/services/offboarding';
import { toggleOffboardingTaskSchema } from '@/lib/zod/offboarding';

type Params = { id: string; taskId: string };

export const PATCH = withOrg<Params>(
  async (req, ctx, { taskId }) => {
    const input = toggleOffboardingTaskSchema.parse(await req.json());
    const row = await toggleOffboardingTask(ctx, taskId, input.done);
    return NextResponse.json({ data: row });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
