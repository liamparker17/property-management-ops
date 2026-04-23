import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type Props = { searchParams: Promise<{ from?: string; to?: string }> };

export default async function LandlordStatementsPage({ searchParams }: Props) {
  const filters = await searchParams;
  return (
    <Suspense fallback={<Skel />}>
      <Content {...filters} />
    </Suspense>
  );
}

async function Content({ from, to }: { from?: string; to?: string }) {
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
        <PageHeader eyebrow="Landlord" title="Statements" />
        <EmptyState title="No landlord record linked" description="Ask your property manager to link your account to a landlord profile." />
      </div>
    );
  }

  const statements = await db.statement.findMany({
    where: {
      orgId: user.orgId,
      subjectType: 'Landlord',
      subjectId: user.landlordId,
      ...(from ? { periodStart: { gte: new Date(from) } } : {}),
      ...(to ? { periodEnd: { lte: new Date(to) } } : {}),
    },
    orderBy: { generatedAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Landlord"
        title="Statements"
        description={`${statements.length} statement${statements.length === 1 ? '' : 's'} on file.`}
      />

      <Card className="p-4">
        <form action="/landlord/statements" className="flex flex-wrap items-end gap-3 text-sm">
          <label className="text-xs text-muted-foreground">
            From
            <input type="date" name="from" defaultValue={from ?? ''} className="ml-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs" />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <input type="date" name="to" defaultValue={to ?? ''} className="ml-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs" />
          </label>
          <button type="submit" className="rounded-lg border border-border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80">Apply</button>
        </form>
      </Card>

      {statements.length === 0 ? (
        <EmptyState title="No statements yet" description="Statements you receive from your property manager will appear here." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Generated</TableHead>
                <TableHead className="px-4 py-3">Period</TableHead>
                <TableHead className="px-4 py-3 text-right">Closing</TableHead>
                <TableHead className="px-4 py-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {statements.map((s) => (
                <TableRow key={s.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">{formatDate(s.generatedAt)}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{formatDate(s.periodStart)} → {formatDate(s.periodEnd)}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{formatZar(s.closingBalanceCents)}</TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <a href={`/api/statements/${s.id}/download`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
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
