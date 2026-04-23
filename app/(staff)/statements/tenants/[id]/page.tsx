import Link from 'next/link';
import { Suspense } from 'react';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { listStatements } from '@/lib/services/statements';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { GenerateStatementForm } from '../../generate-form';

type Props = { params: Promise<{ id: string }> };

export default async function TenantStatementsPage({ params }: Props) {
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

  const tenant = await db.tenant.findFirst({
    where: { id, orgId: ctx.orgId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!tenant) notFound();

  const statements = await listStatements(ctx, { type: 'TENANT', subjectType: 'Tenant', subjectId: id });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/tenants/${id}`} className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to tenant
        </Link>
      </div>
      <PageHeader
        eyebrow="Tenant statements"
        title={`${tenant.firstName} ${tenant.lastName}`}
        description={`${statements.length} statement${statements.length === 1 ? '' : 's'} on file.`}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Generate statement</CardTitle></CardHeader>
        <CardContent>
          <GenerateStatementForm endpoint={`/api/statements/tenants/${id}`} />
        </CardContent>
      </Card>

      {statements.length === 0 ? (
        <EmptyState title="No statements generated yet" description="Pick a period above and generate the first tenant statement." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Generated</TableHead>
                <TableHead className="px-4 py-3">Period</TableHead>
                <TableHead className="px-4 py-3 text-right">Opening</TableHead>
                <TableHead className="px-4 py-3 text-right">Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {statements.map((s) => (
                <TableRow key={s.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">
                    <Link href={`/statements/${s.id}`} className="font-medium text-foreground hover:text-primary">
                      {formatDate(s.generatedAt)}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {formatDate(s.periodStart)} → {formatDate(s.periodEnd)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{formatZar(s.openingBalanceCents)}</TableCell>
                  <TableCell className="px-4 py-3 text-right font-serif">{formatZar(s.closingBalanceCents)}</TableCell>
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
      <Skeleton className="h-4 w-40" />
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
