import Link from 'next/link';
import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { RegenerateButton } from './regenerate-button';

type Props = { params: Promise<{ id: string }> };

export default async function StatementDetailPage({ params }: Props) {
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

  const statement = await db.statement.findFirst({
    where: { id, orgId: ctx.orgId },
    include: { lines: { orderBy: { occurredAt: 'asc' } } },
  });
  if (!statement) notFound();

  const subjectName = statement.subjectType === 'Tenant'
    ? await db.tenant.findFirst({ where: { id: statement.subjectId, orgId: ctx.orgId }, select: { firstName: true, lastName: true } })
      .then((t) => (t ? `${t.firstName} ${t.lastName}` : statement.subjectId))
    : await db.landlord.findFirst({ where: { id: statement.subjectId, orgId: ctx.orgId }, select: { name: true } })
      .then((l) => l?.name ?? statement.subjectId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/statements" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to statements
        </Link>
      </div>
      <PageHeader
        eyebrow={`${statement.type} statement`}
        title={subjectName}
        description={`${formatDate(statement.periodStart)} → ${formatDate(statement.periodEnd)} · ${statement.lines.length} lines`}
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/api/statements/${statement.id}/download`}
              className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            <RegenerateButton statementId={statement.id} />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Opening</CardTitle></CardHeader>
          <CardContent className="font-serif text-2xl">{formatZar(statement.openingBalanceCents)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Closing</CardTitle></CardHeader>
          <CardContent className="font-serif text-2xl">{formatZar(statement.closingBalanceCents)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Generated</CardTitle></CardHeader>
          <CardContent className="text-sm">{formatDate(statement.generatedAt)}</CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="px-4 py-3">Date</TableHead>
              <TableHead className="px-4 py-3">Description</TableHead>
              <TableHead className="px-4 py-3 text-right">Debit</TableHead>
              <TableHead className="px-4 py-3 text-right">Credit</TableHead>
              <TableHead className="px-4 py-3 text-right">Running</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {statement.lines.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">No lines in this period.</TableCell></TableRow>
            ) : (
              statement.lines.map((l) => (
                <TableRow key={l.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">{formatDate(l.occurredAt)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm">{l.description}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{l.debitCents > 0 ? formatZar(l.debitCents) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{l.creditCents > 0 ? formatZar(l.creditCents) : '—'}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{formatZar(l.runningBalanceCents)}</TableCell>
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
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
