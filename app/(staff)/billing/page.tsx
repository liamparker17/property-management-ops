import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Plus, Receipt } from 'lucide-react';

import { auth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { listBillingRuns } from '@/lib/services/billing';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

function statusTone(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400';
    case 'READY':
      return 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300';
    case 'FAILED':
      return 'bg-destructive/10 text-destructive ring-destructive/25';
    case 'DRAFT':
    default:
      return 'bg-muted text-muted-foreground ring-border';
  }
}

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset ${statusTone(value)}`}
    >
      <span className="h-2 w-2 rounded-full bg-current/70" />
      {value}
    </span>
  );
}

function formatPeriod(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}

async function BillingContent() {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };
  const runs = await listBillingRuns(ctx);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Billing runs"
        description="Generate monthly invoices across active leases, review estimates, and publish when ready."
        actions={
          <Link href="/billing/new" className={cn(buttonVariants(), 'gap-1.5')}>
            <Plus className="h-4 w-4" />
            Generate run
          </Link>
        }
      />

      {runs.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-5" />}
          title="No billing runs yet"
          description="Generate your first monthly run to produce invoices for every active lease."
          action={
            <Link href="/billing/new" className={cn(buttonVariants(), 'gap-1.5')}>
              <Plus className="h-4 w-4" />
              Generate run
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Period</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3">Created</TableHead>
                <TableHead className="px-4 py-3">Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {runs.map((run) => (
                <TableRow key={run.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">
                    <Link href={`/billing/runs/${run.id}`} className="font-medium text-foreground hover:text-primary">
                      {formatPeriod(run.periodStart)}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusPill value={run.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{formatDate(run.createdAt)}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {run.publishedAt ? formatDate(run.publishedAt) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Card className="p-4">
        <Skeleton className="h-48 w-full" />
      </Card>
    </div>
  );
}
