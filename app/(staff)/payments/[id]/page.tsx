import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { getReceipt } from '@/lib/services/payments';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AllocationDialog } from '@/components/forms/allocation-dialog';
import { ReverseAllocationDialog } from '@/components/forms/reverse-allocation-dialog';

type PaymentDetailProps = { params: Promise<{ id: string }> };

export default async function PaymentDetailPage({ params }: PaymentDetailProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetailContent id={id} />
    </Suspense>
  );
}

async function DetailContent({ id }: { id: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };

  const receipt = await getReceipt(ctx, id);

  const allocations = await db.allocation.findMany({
    where: { receiptId: receipt.id },
    include: {
      invoiceLineItem: {
        include: { invoice: { include: { lease: { include: { unit: { select: { label: true, property: { select: { name: true } } } } } } } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const tenant = receipt.tenantId
    ? await db.tenant.findFirst({
        where: { id: receipt.tenantId, orgId: ctx.orgId },
        select: { id: true, firstName: true, lastName: true },
      })
    : null;

  const activeAllocated = allocations
    .filter((a) => a.reversedAt === null)
    .reduce((acc, a) => acc + a.amountCents, 0);
  const remaining = receipt.amountCents - activeAllocated;

  let openLineItems: { id: string; description: string; outstandingCents: number }[] = [];
  if (receipt.tenantId) {
    const leaseLinks = await db.leaseTenant.findMany({
      where: { tenantId: receipt.tenantId, lease: { orgId: ctx.orgId } },
      select: { leaseId: true },
    });
    const leaseIds = leaseLinks.map((l) => l.leaseId);
    if (leaseIds.length > 0) {
      const lineItems = await db.invoiceLineItem.findMany({
        where: {
          invoice: { orgId: ctx.orgId, leaseId: { in: leaseIds }, status: { in: ['DUE', 'OVERDUE', 'DRAFT'] } },
        },
        include: { allocations: true, invoice: { select: { periodStart: true } } },
        orderBy: { invoice: { periodStart: 'asc' } },
      });
      openLineItems = lineItems
        .map((l) => {
          const allocated = l.allocations.filter((a) => a.reversedAt === null).reduce((acc, a) => acc + a.amountCents, 0);
          const outstanding = l.amountCents - allocated;
          const periodLabel = `${l.invoice.periodStart.getUTCFullYear()}-${String(l.invoice.periodStart.getUTCMonth() + 1).padStart(2, '0')}`;
          return {
            id: l.id,
            description: `${periodLabel} · ${l.kind.replaceAll('_', ' ')} — ${l.description}`,
            outstandingCents: outstanding,
          };
        })
        .filter((l) => l.outstandingCents > 0);
    }
  }

  const isAdmin = role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/payments" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to payments
        </Link>
      </div>
      <PageHeader
        eyebrow={`Receipt · ${receipt.source}`}
        title={formatZar(receipt.amountCents)}
        description={`${formatDate(receipt.receivedAt)} · ${receipt.method}${receipt.externalRef ? ` · Ref ${receipt.externalRef}` : ''}`}
        actions={
          remaining > 0 ? (
            <AllocationDialog receiptId={receipt.id} remainingCents={remaining} openLineItems={openLineItems} />
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Tenant</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unassigned'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Allocated</CardTitle></CardHeader>
          <CardContent className="font-serif text-2xl">{formatZar(activeAllocated)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Remaining</CardTitle></CardHeader>
          <CardContent className="font-serif text-2xl">{formatZar(remaining)}</CardContent>
        </Card>
      </div>

      {receipt.note ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Note</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{receipt.note}</CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="px-4 py-3">Created</TableHead>
              <TableHead className="px-4 py-3">Target</TableHead>
              <TableHead className="px-4 py-3">Detail</TableHead>
              <TableHead className="px-4 py-3 text-right">Amount</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {allocations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">No allocations recorded yet.</TableCell></TableRow>
            ) : (
              allocations.map((a) => {
                const ageDays = (Date.now() - a.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                const li = a.invoiceLineItem;
                const detail = li
                  ? `${li.invoice.lease.unit.property.name} · ${li.invoice.lease.unit.label} — ${li.description}`
                  : a.depositLeaseId
                    ? 'Deposit hold'
                    : '—';
                return (
                  <TableRow key={a.id} className="even:bg-muted/15 hover:bg-muted/40">
                    <TableCell className="px-4 py-3 text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{a.target}</TableCell>
                    <TableCell className="px-4 py-3 text-sm">{detail}</TableCell>
                    <TableCell className="px-4 py-3 text-right font-serif">{formatZar(a.amountCents)}</TableCell>
                    <TableCell className="px-4 py-3">
                      {a.reversedAt ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-destructive ring-1 ring-inset ring-destructive/25">
                          <span className="h-2 w-2 rounded-full bg-current/70" />
                          Reversed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-current/70" />
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      {a.reversedAt ? null : (
                        <ReverseAllocationDialog allocationId={a.id} isAdmin={isAdmin} ageDays={ageDays} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
