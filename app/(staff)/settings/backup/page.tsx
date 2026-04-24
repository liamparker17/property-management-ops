import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { latestSnapshot, latestVerification, runDailyBackup, runVerification } from '@/lib/services/backup';

const ENCRYPTION_DISCLOSURE =
  'Data is encrypted at rest by Neon (Postgres) and Vercel Blob (file storage) using provider-managed keys.';

function formatBytes(value: bigint | number): string {
  const size = typeof value === 'bigint' ? Number(value) : value;
  if (size === 0) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function BackupSettingsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');

  const ctx = userToRouteCtx(session.user);
  const [dbSnapshot, blobSnapshot, verification, recentSnapshots] = await Promise.all([
    latestSnapshot(ctx, 'DB'),
    latestSnapshot(ctx, 'BLOB_INDEX'),
    latestVerification(ctx),
    db.backupSnapshot.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { takenAt: 'desc' },
      take: 30,
    }),
  ]);

  async function runBackupAction() {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    await runDailyBackup(userToRouteCtx(session.user));
    revalidatePath('/settings/backup');
  }

  async function verifyAction() {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    await runVerification(userToRouteCtx(session.user));
    revalidatePath('/settings/backup');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Backup"
        description="Operational backup posture, verification state, and manual recovery controls for administrators."
        actions={
          <>
            <form action={runBackupAction}>
              <button type="submit" className={buttonVariants({ variant: 'outline' })}>
                Run backup now
              </button>
            </form>
            <form action={verifyAction}>
              <button type="submit" className={buttonVariants({ variant: 'outline' })}>
                Verify now
              </button>
            </form>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SnapshotCard title="Latest DB snapshot" snapshot={dbSnapshot} />
        <SnapshotCard title="Latest blob index" snapshot={blobSnapshot} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest verification</CardTitle>
            <CardDescription>Weekly restore smoke-test status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {verification ? (
              <>
                <Badge variant={verification.status === 'OK' ? 'secondary' : 'destructive'}>
                  {verification.status}
                </Badge>
                <p>Started: {formatDate(verification.startedAt)}</p>
                <p>Missing: {verification.missingCount}</p>
                <p>Corrupt: {verification.corruptCount}</p>
              </>
            ) : (
              <EmptyState title="No verification run yet" description="The weekly backup verification cron will populate this card." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recovery posture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>RPO: 24 hours</p>
          <p>RTO: 4 hours</p>
          <p>{ENCRYPTION_DISCLOSURE}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent snapshots</CardTitle>
          <CardDescription>Last 30 backup and blob-index artifacts for this organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSnapshots.length === 0 ? (
            <EmptyState title="No snapshots yet" description="Run a backup or wait for the scheduled cron to populate history." />
          ) : (
            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="px-4 py-3">Taken</TableHead>
                    <TableHead className="px-4 py-3">Kind</TableHead>
                    <TableHead className="px-4 py-3">Status</TableHead>
                    <TableHead className="px-4 py-3">Size</TableHead>
                    <TableHead className="px-4 py-3">Checksum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {recentSnapshots.map((snapshot) => (
                    <TableRow key={snapshot.id} className="even:bg-muted/15 hover:bg-muted/40">
                      <TableCell className="px-4 py-3">{formatDate(snapshot.takenAt)}</TableCell>
                      <TableCell className="px-4 py-3">{snapshot.kind}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant={snapshot.status === 'OK' ? 'secondary' : 'destructive'}>
                          {snapshot.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">{formatBytes(snapshot.sizeBytes)}</TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {snapshot.checksum.slice(0, 12)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SnapshotCard({
  title,
  snapshot,
}: {
  title: string;
  snapshot: { takenAt: Date; sizeBytes: bigint; checksum: string; status: string } | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {snapshot ? (
          <>
            <Badge variant={snapshot.status === 'OK' ? 'secondary' : 'destructive'}>
              {snapshot.status}
            </Badge>
            <p>Taken: {formatDate(snapshot.takenAt)}</p>
            <p>Size: {formatBytes(snapshot.sizeBytes)}</p>
            <p className="font-mono text-xs text-muted-foreground">Checksum: {snapshot.checksum.slice(0, 12)}</p>
          </>
        ) : (
          <EmptyState title="No snapshot yet" description="Run the backup job to create the first artifact." />
        )}
      </CardContent>
    </Card>
  );
}
