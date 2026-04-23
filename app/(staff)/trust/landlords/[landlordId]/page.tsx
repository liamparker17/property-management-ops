import Link from 'next/link';
import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { getTrustBalance } from '@/lib/services/trust';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type LandlordTrustPageProps = { params: Promise<{ landlordId: string }> };

export default async function LandlordTrustPage({ params }: LandlordTrustPageProps) {
  const { landlordId } = await params;
  return (
    <Suspense fallback={<LandlordTrustSkeleton />}>
      <Content landlordId={landlordId} />
    </Suspense>
  );
}

async function Content({ landlordId }: { landlordId: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };

  const landlord = await db.landlord.findFirst({
    where: { id: landlordId, orgId: ctx.orgId },
    select: { id: true, name: true },
  });
  if (!landlord) notFound();

  const [balance, entries] = await Promise.all([
    getTrustBalance(ctx, landlordId),
    db.trustLedgerEntry.findMany({
      where: { landlordId, trustAccount: { orgId: ctx.orgId } },
      orderBy: { occurredAt: 'asc' },
      take: 500,
    }),
  ]);

  let running = 0;
  const rows = entries.map((e) => {
    running += e.amountCents;
    return { ...e, runningBalanceCents: running };
  });
  // newest first for display
  const display = [...rows].reverse();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/trust" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to trust
        </Link>
      </div>
      <PageHeader
        eyebrow="Landlord trust"
        title={landlord.name}
        description={`Total ${formatZar(balance.totalCents)} · deposits ${formatZar(balance.depositsCents)} · unapplied ${formatZar(balance.unappliedCents)}`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent className="font-serif text-2xl">{formatZar(balance.totalCents)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Deposits held</CardTitle></CardHeader>
          <CardContent className="font-serif text-2xl">{formatZar(balance.depositsCents)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Unapplied</CardTitle></CardHeader>
          <CardContent className="font-serif text-2xl">{formatZar(balance.unappliedCents)}</CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="px-4 py-3">Date</TableHead>
              <TableHead className="px-4 py-3">Type</TableHead>
              <TableHead className="px-4 py-3">Note</TableHead>
              <TableHead className="px-4 py-3 text-right">Amount</TableHead>
              <TableHead className="px-4 py-3 text-right">Running</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {display.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">No ledger entries yet.</TableCell></TableRow>
            ) : (
              display.map((e) => (
                <TableRow key={e.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">{formatDate(e.occurredAt)}</TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{e.type}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">{e.note ?? '—'}</TableCell>
                  <TableCell className={`px-4 py-3 text-right font-serif ${e.amountCents < 0 ? 'text-destructive' : ''}`}>
                    {formatZar(e.amountCents)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{formatZar(e.runningBalanceCents)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function LandlordTrustSkeleton() {
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
