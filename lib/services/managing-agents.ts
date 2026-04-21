import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type {
  createManagingAgentSchema,
  updateManagingAgentSchema,
} from '@/lib/zod/managing-agents';

export async function listManagingAgents(
  ctx: RouteCtx,
  opts: { includeArchived?: boolean } = {},
) {
  return db.managingAgent.findMany({
    where: {
      orgId: ctx.orgId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      archivedAt: true,
      _count: { select: { assignedProperties: true } },
    },
  });
}

export async function getManagingAgent(ctx: RouteCtx, id: string) {
  const agent = await db.managingAgent.findFirst({
    where: { id, orgId: ctx.orgId },
  });
  if (!agent) throw ApiError.notFound('Managing agent not found');
  return agent;
}

export async function createManagingAgent(
  ctx: RouteCtx,
  input: z.infer<typeof createManagingAgentSchema>,
) {
  return db.managingAgent.create({
    data: {
      orgId: ctx.orgId,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      notes: input.notes || null,
    },
  });
}

export async function updateManagingAgent(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateManagingAgentSchema>,
) {
  const existing = await db.managingAgent.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!existing) throw ApiError.notFound('Managing agent not found');
  const { archived, name, email, phone, notes } = input;
  return db.managingAgent.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
      ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
    },
  });
}
