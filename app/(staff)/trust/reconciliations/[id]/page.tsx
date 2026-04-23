import Link from 'next/link';
import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { ResolveExceptionButton } from './resolve-button';

type Props = { params: Promise<{ id: string }> };

export default async function ReconRunDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<Skel />}>
      <Content id={id} />
    </Suspense>
  );
}

async function Content({ id }: { id: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };

  const run = await db.reconciliationRun.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { exceptions: { orderBy: { createdAt: 'desc' } } },
  });
  if (!run) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/trust/reconciliations" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to runs
        </Link>
      </div>
      <PageHeader
        eyebrow={`Reconciliation · ${run.status}`}
        title={`${formatDate(run.periodStart)} → ${formatDate(run.periodEnd)}`}
        description={`Created ${formatDate(run.createdAt)} · ${run.exceptions.length} exceptions`}
      />

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="px-4 py-3">Created</TableHead>
              <TableHead className="px-4 py-3">Kind</TableHead>
              <TableHead className="px-4 py-3">Entity</TableHead>
              <TableHead className="px-4 py-3">Detail</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {run.exceptions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">No exceptions on this run.</TableCell></TableRow>
            ) : (
              run.exceptions.map((ex) => (
                <TableRow key={ex.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">{formatDate(ex.createdAt)}</TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{ex.kind}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">{ex.entityType} · {ex.entityId}</TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">{JSON.stringify(ex.detail)}</TableCell>
                  <TableCell className="px-4 py-3">
                    {ex.resolvedAt ? (
                      <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">Resolved</span>
                    ) : (
                      <span className="font-mono text-xs text-amber-700 dark:text-amber-300">Open</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    {ex.resolvedAt ? null : <ResolveExceptionButton exceptionId={ex.id} />}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Skel() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
