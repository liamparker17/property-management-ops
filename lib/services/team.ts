import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { z } from 'zod';
import type {
  createUserSchema,
  updateUserSchema,
  updateOrgSchema,
  changePasswordSchema,
} from '@/lib/zod/team';

export async function listTeam(ctx: RouteCtx) {
  return db.user.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { email: 'asc' },
    select: { id: true, email: true, name: true, role: true, disabledAt: true, createdAt: true },
  });
}

export async function createTeamUser(ctx: RouteCtx, input: z.infer<typeof createUserSchema>) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('A user with this email already exists');
  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      orgId: ctx.orgId,
      passwordHash,
    },
    select: { id: true, email: true, name: true, role: true },
  });
}

export async function updateTeamUser(
  ctx: RouteCtx,
  id: string,
  input: z.infer<typeof updateUserSchema>,
) {
  const existing = await db.user.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!existing) throw ApiError.notFound('User not found');
  return db.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.disabled !== undefined
        ? { disabledAt: input.disabled ? new Date() : null }
        : {}),
    },
    select: { id: true, email: true, name: true, role: true, disabledAt: true },
  });
}

export async function getOrg(ctx: RouteCtx) {
  const org = await db.org.findUnique({ where: { id: ctx.orgId } });
  if (!org) throw ApiError.notFound('Org not found');
  return org;
}

export async function updateOrg(ctx: RouteCtx, input: z.infer<typeof updateOrgSchema>) {
  return db.org.update({ where: { id: ctx.orgId }, data: input });
}

export async function changeOwnPassword(ctx: RouteCtx, input: z.infer<typeof changePasswordSchema>) {
  const user = await db.user.findUnique({ where: { id: ctx.userId } });
  if (!user) throw ApiError.notFound('User not found');
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) throw ApiError.validation({ currentPassword: 'Incorrect password' });
  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.user.update({ where: { id: ctx.userId }, data: { passwordHash } });
  return { ok: true };
}
