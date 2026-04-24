import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { list as listBlobs } from '@vercel/blob';
import type { BackupSnapshot, BackupVerificationRun } from '@prisma/client';

import type { RouteCtx } from '@/lib/auth/with-org';
import { deleteBlob, uploadBlob } from '@/lib/blob';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { writeAudit } from '@/lib/services/audit';

type CommandResult = {
  stdout: Buffer;
  stderr: Buffer;
};

type BackupRuntime = {
  runCommand(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<CommandResult>;
  fetch(url: string): Promise<Response>;
  list(prefix: string): Promise<Array<{ pathname: string; size: number; etag?: string | null }>>;
};

let runtimeOverride: Partial<BackupRuntime> | null = null;

function resolveRuntime(): BackupRuntime {
  return {
    runCommand: runtimeOverride?.runCommand ?? runCommand,
    fetch: runtimeOverride?.fetch ?? fetch,
    list: runtimeOverride?.list ?? defaultList,
  };
}

export function __setBackupRuntimeForTests(runtime: Partial<BackupRuntime> | null) {
  runtimeOverride = runtime;
}

function backupPrefix(): string {
  const raw = process.env.BACKUP_BLOB_PREFIX?.trim() || 'backups/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

function formatSastStamp(date: Date): string {
  const sast = new Date(date.getTime() + 2 * 60 * 60 * 1000);
  const year = sast.getUTCFullYear();
  const month = String(sast.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sast.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function storageKeyFor(orgId: string, stamp: string, filename: string): string {
  return `${backupPrefix()}${orgId}/${stamp}/${filename}`;
}

function sha256(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}

async function runCommand(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...(env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('error', reject);
    child.on('close', (code) => {
      const result = { stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) };
      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(result.stderr.toString('utf8') || `${command} exited with ${code}`));
      }
    });
  });
}

async function defaultList(prefix: string) {
  const result = (await listBlobs({ prefix })) as { blobs?: Array<{ pathname: string; size: number; etag?: string | null }> };
  return result.blobs ?? [];
}

function publicBlobUrl(pathname: string) {
  return pathname.startsWith('http') ? pathname : `https://blob.vercel-storage.com/${pathname}`;
}

async function uploadBackupFile(path: string, filename: string, contentType: string, content: Buffer) {
  const file = new File([new Uint8Array(content)], filename, { type: contentType });
  const { pathname } = await uploadBlob(path, file, { addRandomSuffix: false });
  return pathname;
}

async function pgDumpVersion(runtime: BackupRuntime, bin: string): Promise<string | null> {
  try {
    const result = await runtime.runCommand(bin, ['--version']);
    return result.stdout.toString('utf8').trim() || null;
  } catch {
    return null;
  }
}

async function recordSnapshotAudit(ctx: RouteCtx, snapshot: BackupSnapshot) {
  await writeAudit(ctx, {
    entityType: 'BackupSnapshot',
    entityId: snapshot.id,
    action: snapshot.status === 'FAILED' ? 'FAILED' : 'CREATED',
    payload: {
      kind: snapshot.kind,
      storageKey: snapshot.storageKey,
      checksum: snapshot.checksum,
      status: snapshot.status,
    },
  });
}

async function latestBlobManifest(ctx: RouteCtx): Promise<{ fileCount: number } | null> {
  const row = await db.backupSnapshot.findFirst({
    where: { orgId: ctx.orgId, kind: 'BLOB_INDEX', status: 'OK' },
    orderBy: { takenAt: 'desc' },
  });
  if (!row) return null;
  const response = await resolveRuntime().fetch(publicBlobUrl(row.storageKey));
  if (!response.ok) return null;
  const payload = (await response.json()) as Array<unknown>;
  return { fileCount: payload.length };
}

export async function runDailyBackup(ctx: RouteCtx): Promise<BackupSnapshot> {
  const runtime = resolveRuntime();
  const stamp = formatSastStamp(new Date());
  const bin = process.env.PG_DUMP_BIN?.trim() || 'pg_dump';
  const path = storageKeyFor(ctx.orgId, stamp, 'pg_dump.sql.gz');
  const version = await pgDumpVersion(runtime, bin);

  try {
    const result = await runtime.runCommand(bin, [
      '--dbname',
      process.env.DATABASE_URL ?? '',
      '--format=custom',
      '--compress=0',
      '--no-owner',
      '--no-privileges',
    ]);
    const archive = gzipSync(result.stdout);
    const checksum = sha256(archive);
    const storageKey = await uploadBackupFile(path, 'pg_dump.sql.gz', 'application/gzip', archive);

    const snapshot = await db.backupSnapshot.create({
      data: {
        orgId: ctx.orgId,
        sizeBytes: BigInt(archive.byteLength),
        storageKey,
        checksum,
        kind: 'DB',
        status: 'OK',
        pgDumpVersion: version,
      },
    });

    await recordSnapshotAudit(ctx, snapshot);
    return snapshot;
  } catch (error) {
    const snapshot = await db.backupSnapshot.create({
      data: {
        orgId: ctx.orgId,
        sizeBytes: BigInt(0),
        storageKey: path,
        checksum: 'FAILED',
        kind: 'DB',
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Backup failed',
        pgDumpVersion: version,
      },
    });
    await recordSnapshotAudit(ctx, snapshot);
    throw error;
  }
}

export async function runBlobIndex(ctx: RouteCtx): Promise<BackupSnapshot> {
  const runtime = resolveRuntime();
  const stamp = formatSastStamp(new Date());
  const path = storageKeyFor(ctx.orgId, stamp, 'blob_manifest.json');
  const blobs = await runtime.list(`orgs/${ctx.orgId}/`);
  const manifest = blobs
    .sort((a, b) => a.pathname.localeCompare(b.pathname))
    .map((blob) => ({
      pathname: blob.pathname,
      size: blob.size,
      checksum: blob.etag ?? sha256(`${blob.pathname}:${blob.size}`),
    }));
  const body = Buffer.from(JSON.stringify(manifest, null, 2), 'utf8');
  const checksum = sha256(body);
  const storageKey = await uploadBackupFile(path, 'blob_manifest.json', 'application/json', body);

  const snapshot = await db.backupSnapshot.create({
    data: {
      orgId: ctx.orgId,
      sizeBytes: BigInt(body.byteLength),
      storageKey,
      checksum,
      kind: 'BLOB_INDEX',
      status: 'OK',
    },
  });

  // Future extension: while walking blobs for the manifest, compute Document.checksum for legacy rows.
  await recordSnapshotAudit(ctx, snapshot);
  return snapshot;
}

export async function latestSnapshot(
  ctx: RouteCtx,
  kind: 'DB' | 'BLOB_INDEX',
): Promise<BackupSnapshot | null> {
  return db.backupSnapshot.findFirst({
    where: { orgId: ctx.orgId, kind },
    orderBy: { takenAt: 'desc' },
  });
}

export async function latestVerification(ctx: RouteCtx): Promise<BackupVerificationRun | null> {
  return db.backupVerificationRun.findFirst({
    where: { orgId: ctx.orgId },
    orderBy: { startedAt: 'desc' },
  });
}

async function sampleCounts(connectionString: string): Promise<Record<string, number>> {
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ['error'],
  });
  try {
    const [orgs, users, leases, receipts] = await Promise.all([
      client.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "Org"`,
      client.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "User"`,
      client.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "Lease"`,
      client.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "PaymentReceipt"`,
    ]);
    return {
      Org: Number(orgs[0]?.count ?? BigInt(0)),
      User: Number(users[0]?.count ?? BigInt(0)),
      Lease: Number(leases[0]?.count ?? BigInt(0)),
      PaymentReceipt: Number(receipts[0]?.count ?? BigInt(0)),
    };
  } finally {
    await client.$disconnect();
  }
}

export async function runVerification(ctx: RouteCtx): Promise<BackupVerificationRun> {
  const runtime = resolveRuntime();
  const latest = await db.backupSnapshot.findFirst({
    where: { orgId: ctx.orgId, kind: 'DB', status: 'OK' },
    orderBy: { takenAt: 'desc' },
  });
  if (!latest) {
    throw ApiError.notFound('No successful DB backup snapshot found');
  }

  const startedAt = new Date();
  const verification = await db.backupVerificationRun.create({
    data: {
      orgId: ctx.orgId,
      status: 'FAILED',
      missingCount: 0,
      corruptCount: 0,
    },
  });

  const tmpRoot = await mkdtemp(join(tmpdir(), 'pmops-backup-'));
  try {
    const response = await runtime.fetch(publicBlobUrl(latest.storageKey));
    if (!response.ok) throw new Error('Failed to download backup artifact');

    const archive = Buffer.from(await response.arrayBuffer());
    const restored = gunzipSync(archive);
    const dumpPath = join(tmpRoot, 'backup.dump');
    await writeFile(dumpPath, restored);

    const manifest = await latestBlobManifest(ctx);
    const lineCount = restored.toString('utf8').split(/\r?\n/).length;
    const restoreTarget = process.env.BACKUP_VERIFICATION_NEON_BRANCH_URL?.trim();

    let details: Record<string, unknown> = {
      fileCount: manifest?.fileCount ?? 0,
      lineCount,
    };

    if (restoreTarget) {
      await runtime.runCommand('pg_restore', [
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-privileges',
        '--dbname',
        restoreTarget,
        dumpPath,
      ]);
      details = {
        ...details,
        restoreTargetHash: sha256(restoreTarget),
        sampleCounts: await sampleCounts(restoreTarget),
      };
    } else {
      await runtime.runCommand('pg_restore', ['--list', dumpPath]);
    }

    const updated = await db.backupVerificationRun.update({
      where: { id: verification.id },
      data: {
        status: 'OK',
        completedAt: new Date(),
        summary: { snapshotId: latest.id, ok: true } as Prisma.JsonObject,
        details: details as Prisma.JsonObject,
      },
    });

    await writeAudit(ctx, {
      entityType: 'BackupVerificationRun',
      entityId: updated.id,
      action: 'COMPLETED',
      payload: details,
    });

    return updated;
  } catch (error) {
    const updated = await db.backupVerificationRun.update({
      where: { id: verification.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        corruptCount: 1,
        summary: {
          snapshotId: latest.id,
          ok: false,
          error: error instanceof Error ? error.message : 'Verification failed',
        } as Prisma.JsonObject,
        details: {
          error: error instanceof Error ? error.message : 'Verification failed',
        } as Prisma.JsonObject,
      },
    });

    await writeAudit(ctx, {
      entityType: 'BackupVerificationRun',
      entityId: updated.id,
      action: 'FAILED',
      payload: { error: error instanceof Error ? error.message : 'Verification failed' },
    });

    return updated;
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

export async function pruneOldBackups(
  ctx: RouteCtx,
): Promise<{ snapshotsDeleted: number; runsDeleted: number }> {
  const cutoff = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
  const [snapshots, runs] = await Promise.all([
    db.backupSnapshot.findMany({
      where: { orgId: ctx.orgId, takenAt: { lt: cutoff } },
      select: { id: true, storageKey: true },
    }),
    db.backupVerificationRun.findMany({
      where: { orgId: ctx.orgId, startedAt: { lt: cutoff } },
      select: { id: true },
    }),
  ]);

  for (const snapshot of snapshots) {
    if (snapshot.storageKey) {
      await deleteBlob(snapshot.storageKey).catch(() => undefined);
    }
  }

  if (snapshots.length > 0) {
    await db.backupSnapshot.deleteMany({
      where: { id: { in: snapshots.map((snapshot) => snapshot.id) } },
    });
  }
  if (runs.length > 0) {
    await db.backupVerificationRun.deleteMany({
      where: { id: { in: runs.map((run) => run.id) } },
    });
  }

  await writeAudit(ctx, {
    entityType: 'BackupSnapshot',
    entityId: ctx.orgId,
    action: 'PRUNE',
    payload: {
      cutoff: cutoff.toISOString(),
      snapshotsDeleted: snapshots.length,
      runsDeleted: runs.length,
    },
  });

  return { snapshotsDeleted: snapshots.length, runsDeleted: runs.length };
}
