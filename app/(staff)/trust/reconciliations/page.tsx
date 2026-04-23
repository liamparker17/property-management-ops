import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { listReconciliationRuns } from '@/lib/services/reconciliations';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function ReconciliationsPage() {
  return (
    <Suspense fallback={<RunsSkeleton />}>
      <RunsContent />
    </Suspense>
  );
}

async function RunsContent() {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };
  const runs = await listReconciliationRuns(ctx);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trust"
        title="Reconciliations"
        description="Bank-feed vs. receipt matching runs. Exceptions surface unmatched bank transactions."
      />

      {runs.length === 0 ? (
        <EmptyState title="No reconciliation runs yet" description="Cron triggers a run twice daily once a QBO bank feed or CSV import is available." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Created</TableHead>
                <TableHead className="px-4 py-3">Period</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3 text-right">Exceptions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {runs.map((r) => {
                const open = (r as { exceptions?: { resolvedAt: Date | null }[] }).exceptions?.filter((x) => !x.resolvedAt).length ?? 0;
                return (
                  <TableRow key={r.id} className="even:bg-muted/15 hover:bg-muted/40">
                    <TableCell className="px-4 py-3">
                      <Link href={`/trust/reconciliations/${r.id}`} className="font-medium text-foreground hover:text-primary">
                        {formatDate(r.createdAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {formatDate(r.periodStart)} → {formatDate(r.periodEnd)}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{r.status}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {open > 0 ? (
                        <span className="font-mono text-xs text-amber-700 dark:text-amber-300">{open} open</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function RunsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
