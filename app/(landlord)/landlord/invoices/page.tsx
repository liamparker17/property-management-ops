import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = { searchParams: Promise<{ status?: string }> };

export default async function LandlordInvoicesPage({ searchParams }: Props) {
  const filters = await searchParams;
  return (
    <Suspense fallback={<Skel />}>
      <Content {...filters} />
    </Suspense>
  );
}

async function Content({ status }: { status?: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'LANDLORD') redirect('/login');

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { landlordId: true, orgId: true },
  });
  if (!user?.landlordId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Landlord" title="Invoices" />
        <EmptyState title="No landlord record linked" description="Ask your property manager to link your account to a landlord profile." />
      </div>
    );
  }

  const invoices = await db.invoice.findMany({
    where: {
      orgId: user.orgId,
      lease: { unit: { property: { landlordId: user.landlordId } } },
      ...(status ? { status: status as 'DUE' } : {}),
    },
    include: {
      lease: {
        include: {
          unit: { include: { property: { select: { name: true } } } },
        },
      },
    },
    orderBy: { periodStart: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Landlord"
        title="Invoices"
        description={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} across your properties.`}
      />

      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="As leases are billed, invoices will appear here grouped by property." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Period</TableHead>
                <TableHead className="px-4 py-3">Property / Unit</TableHead>
                <TableHead className="px-4 py-3">Due</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">{formatDate(inv.periodStart)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="font-medium">{inv.lease.unit.property.name}</div>
                    <div className="text-xs text-muted-foreground">{inv.lease.unit.label}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{inv.status}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{formatZar(inv.totalCents || inv.amountCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function Skel() {
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
