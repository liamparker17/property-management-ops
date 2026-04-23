import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Upload, Wallet } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
// listReceipts returns receipts with allocations included, but its declared return type
// hides the relation; query directly for correct typing.
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const SOURCES = ['ALL', 'MANUAL', 'CSV_IMPORT', 'STITCH', 'DEBICHECK'] as const;

type PaymentsPageProps = {
  searchParams: Promise<{ source?: string; tenantId?: string; leaseId?: string; allocation?: string }>;
};

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const filters = await searchParams;
  return (
    <Suspense fallback={<PaymentsSkeleton />}>
      <PaymentsContent {...filters} />
    </Suspense>
  );
}

async function PaymentsContent({
  source,
  tenantId,
  leaseId,
  allocation,
}: {
  source?: string;
  tenantId?: string;
  leaseId?: string;
  allocation?: string;
}) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };

  const parsedSource = SOURCES.includes((source ?? 'ALL') as (typeof SOURCES)[number])
    ? (source as (typeof SOURCES)[number])
    : 'ALL';

  const receipts = await db.paymentReceipt.findMany({
    where: {
      orgId: ctx.orgId,
      ...(parsedSource !== 'ALL' ? { source: parsedSource as 'MANUAL' } : {}),
      ...(tenantId ? { tenantId } : {}),
      ...(leaseId ? { leaseId } : {}),
    },
    orderBy: { receivedAt: 'desc' },
    include: { allocations: true },
  });

  const tenantIds = Array.from(new Set(receipts.map((r) => r.tenantId).filter((x): x is string => !!x)));
  const tenants = tenantIds.length
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds }, orgId: ctx.orgId },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));

  const filtered = receipts.filter((r) => {
    if (!allocation) return true;
    const allocated = r.allocations
      .filter((a) => a.reversedAt === null)
      .reduce((acc, a) => acc + a.amountCents, 0);
    if (allocation === 'unallocated') return allocated < r.amountCents;
    if (allocation === 'fully') return allocated >= r.amountCents;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Payments"
        description={`${filtered.length} ${filtered.length === 1 ? 'receipt' : 'receipts'} in view.`}
        actions={
          <Link href="/payments/import" className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4">
          <form action="/payments" className="flex flex-wrap items-end gap-3 text-sm">
            <div className="flex flex-wrap gap-1">
              {SOURCES.map((s) => {
                const active = parsedSource === s;
                const href = s === 'ALL' ? '/payments' : `/payments?source=${s}`;
                return (
                  <Link
                    key={s}
                    href={href}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium',
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {s.replace('_', ' ')}
                  </Link>
                );
              })}
            </div>
            <label className="text-xs text-muted-foreground">
              Allocation
              <select
                name="allocation"
                defaultValue={allocation ?? ''}
                className="ml-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs"
              >
                <option value="">All</option>
                <option value="unallocated">Unallocated / partial</option>
                <option value="fully">Fully allocated</option>
              </select>
            </label>
            {parsedSource !== 'ALL' ? <input type="hidden" name="source" value={parsedSource} /> : null}
            <button
              type="submit"
              className="rounded-lg border border-border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-5" />}
          title="No receipts match these filters"
          description="Import a bank CSV or capture a manual receipt to start allocating against invoices."
          action={
            <Link href="/payments/import" className={cn(buttonVariants(), 'gap-1.5')}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Received</TableHead>
                <TableHead className="px-4 py-3">Tenant</TableHead>
                <TableHead className="px-4 py-3">Method</TableHead>
                <TableHead className="px-4 py-3">Source</TableHead>
                <TableHead className="px-4 py-3">Reference</TableHead>
                <TableHead className="px-4 py-3 text-right">Amount</TableHead>
                <TableHead className="px-4 py-3 text-right">Allocated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {filtered.map((r) => {
                const tenant = r.tenantId ? tenantMap.get(r.tenantId) : null;
                const allocated = r.allocations
                  .filter((a) => a.reversedAt === null)
                  .reduce((acc, a) => acc + a.amountCents, 0);
                return (
                  <TableRow key={r.id} className="even:bg-muted/15 hover:bg-muted/40">
                    <TableCell className="px-4 py-3">
                      <Link href={`/payments/${r.id}`} className="font-medium text-foreground hover:text-primary">
                        {formatDate(r.receivedAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unassigned'}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {r.method}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {r.source}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">{r.externalRef ?? '—'}</TableCell>
                    <TableCell className="px-4 py-3 text-right font-serif">{formatZar(r.amountCents)}</TableCell>
                    <TableCell className="px-4 py-3 text-right text-muted-foreground">
                      {formatZar(allocated)} <span className="text-xs">/ {formatZar(r.amountCents)}</span>
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

function PaymentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Card className="p-4"><Skeleton className="h-64 w-full" /></Card>
    </div>
  );
}
