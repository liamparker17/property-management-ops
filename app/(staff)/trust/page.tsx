import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatZar } from '@/lib/format';
import { getPortfolioTrustBalance } from '@/lib/services/trust';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DisburseDialog } from './disburse-dialog';

export default async function TrustPage() {
  return (
    <Suspense fallback={<TrustSkeleton />}>
      <TrustContent />
    </Suspense>
  );
}

async function TrustContent() {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };

  const [portfolio, landlords, exceptionsCount] = await Promise.all([
    getPortfolioTrustBalance(ctx),
    db.landlord.findMany({
      where: { orgId: ctx.orgId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.reconciliationException.count({
      where: { resolvedAt: null, run: { orgId: ctx.orgId } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Trust"
        description="Per-landlord trust balances and disbursement controls."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/trust/reconciliations"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Reconciliations
              {exceptionsCount > 0 ? (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/15 px-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  {exceptionsCount}
                </span>
              ) : null}
            </Link>
            <DisburseDialog landlords={landlords} />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Portfolio trust balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-serif text-4xl">{formatZar(portfolio.totalCents)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Sum of every landlord trust account in this workspace.</p>
        </CardContent>
      </Card>

      {portfolio.perLandlord.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          title="No landlord trust accounts yet"
          description="Trust accounts are created automatically when the first receipt or disbursement is recorded for a landlord."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Landlord</TableHead>
                <TableHead className="px-4 py-3 text-right">Trust balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {portfolio.perLandlord.map((row) => (
                <TableRow key={row.landlordId} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">
                    <Link
                      href={`/trust/landlords/${row.landlordId}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{formatZar(row.totalCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function TrustSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
