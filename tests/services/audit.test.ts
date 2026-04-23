import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.DATABASE_URL ??= 'postgresql://pmops:pmops@localhost:5432/pmops_test';

type CreateArgs = { data: Record<string, unknown> };

let db: any;
let writeAudit: (
  ctx: { orgId: string; userId: string; role: string },
  input: {
    entityType: string;
    entityId: string;
    action: string;
    diff?: unknown;
    payload?: unknown;
  },
) => Promise<void>;

const createCalls: CreateArgs[] = [];
let createImpl: (args: CreateArgs) => Promise<unknown>;
const consoleErrorCalls: unknown[][] = [];
const originalConsoleError = console.error;
let originalAuditCreate: typeof db.auditLog.create;

before(async () => {
  const dbModule = (await import('@/lib/db')) as any;
  db = (dbModule.default ?? dbModule).db;
  originalAuditCreate = db.auditLog.create;
  db.auditLog.create = async (args: CreateArgs) => createImpl(args);
  console.error = ((...args: unknown[]) => {
    consoleErrorCalls.push(args);
  }) as typeof console.error;

  const auditModule = (await import('@/lib/services/audit')) as any;
  writeAudit = (auditModule.default ?? auditModule).writeAudit;
});

after(async () => {
  db.auditLog.create = originalAuditCreate;
  console.error = originalConsoleError;
  await db.$disconnect();
});

beforeEach(() => {
  createCalls.length = 0;
  consoleErrorCalls.length = 0;
  createImpl = async (args: CreateArgs) => {
    createCalls.push(args);
    return { id: 'audit-1', ...args.data };
  };
});

const ctx = {
  orgId: 'org-1',
  userId: 'user-1',
  role: 'ADMIN',
} as const;

describe('writeAudit', () => {
  it('writes a normalized audit row', async () => {
    await writeAudit(ctx, {
      entityType: ' OrgFeature ',
      entityId: ' UTILITIES_BILLING ',
      action: ' toggle ',
      diff: { before: false, after: true },
      payload: { key: 'UTILITIES_BILLING' },
    });

    assert.equal(createCalls.length, 1);
    assert.deepEqual(createCalls[0]?.data, {
      orgId: 'org-1',
      actorUserId: 'user-1',
      entityType: 'OrgFeature',
      entityId: 'UTILITIES_BILLING',
      action: 'toggle',
      diff: { before: false, after: true },
      payload: { key: 'UTILITIES_BILLING' },
    });
    assert.equal(consoleErrorCalls.length, 0);
  });

  it('swallows insert failures and logs them', async () => {
    createImpl = async () => {
      throw new Error('write failed');
    };

    await assert.doesNotReject(() =>
      writeAudit(ctx, {
        entityType: 'OrgFeature',
        entityId: 'UTILITIES_BILLING',
        action: 'toggle',
      }),
    );

    assert.equal(consoleErrorCalls.length, 1);
  });

  it('still rejects invalid audit input', async () => {
    await assert.rejects(
      writeAudit(ctx, {
        entityType: '   ',
        entityId: 'UTILITIES_BILLING',
        action: 'toggle',
      }),
      { code: 'VALIDATION_ERROR', status: 422 },
    );

    assert.equal(createCalls.length, 0);
  });
});
