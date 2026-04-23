import type { Role } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';

type CreateNotificationInput = {
  userId?: string | null;
  role?: Role | null;
  type: string;
  subject: string;
  body: string;
  payload?: unknown;
  entityType?: string | null;
  entityId?: string | null;
};

export async function createNotification(ctx: RouteCtx, input: CreateNotificationInput) {
  return db.notification.create({
    data: {
      orgId: ctx.orgId,
      userId: input.userId ?? null,
      role: input.role ?? null,
      type: input.type,
      subject: input.subject,
      body: input.body,
      payload: input.payload ?? undefined,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}
