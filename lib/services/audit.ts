import { Prisma } from '@prisma/client';
import type { RouteCtx } from '@/lib/auth/with-org';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';

type WriteAuditInput = {
  entityType: string;
  entityId: string;
  action: string;
  diff?: unknown;
  payload?: unknown;
};

type AuditLogDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
};

function getAuditLogDelegate(): AuditLogDelegate | null {
  const auditLog = (db as unknown as { auditLog?: AuditLogDelegate }).auditLog;

  if (!auditLog || typeof auditLog.create !== 'function') {
    return null;
  }

  return auditLog;
}

function requireNonEmpty(value: string, field: 'entityType' | 'entityId' | 'action') {
  const trimmed = value.trim();
  if (!trimmed) {
    throw ApiError.validation({ [field]: ['Required'] }, 'Invalid audit input');
  }
  return trimmed;
}

function toAuditJson(
  field: 'diff' | 'payload',
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;

  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return Prisma.JsonNull;
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  } catch {
    throw ApiError.validation({ [field]: ['Must be JSON-serializable'] }, 'Invalid audit input');
  }
}

export async function writeAudit(ctx: RouteCtx, input: WriteAuditInput): Promise<void> {
  const entityType = requireNonEmpty(input.entityType, 'entityType');
  const entityId = requireNonEmpty(input.entityId, 'entityId');
  const action = requireNonEmpty(input.action, 'action');
  const diff = toAuditJson('diff', input.diff);
  const payload = toAuditJson('payload', input.payload);

  const delegate = getAuditLogDelegate();
  if (!delegate) {
    console.error('[audit] AuditLog delegate unavailable; skipping audit write', {
      orgId: ctx.orgId,
      entityType,
      entityId,
      action,
    });
    return;
  }

  try {
    await delegate.create({
      data: {
        orgId: ctx.orgId,
        actorUserId: ctx.userId,
        entityType,
        entityId,
        action,
        ...(diff !== undefined ? { diff } : {}),
        ...(payload !== undefined ? { payload } : {}),
      },
    });
  } catch (error) {
    console.error('[audit] Failed to write audit log', {
      orgId: ctx.orgId,
      entityType,
      entityId,
      action,
      error,
    });
  }
}
