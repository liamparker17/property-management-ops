import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { listStatements } from '@/lib/services/statements';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { StatementType } from '@prisma/client';

const TYPES = ['ALL', 'TENANT', 'LANDLORD', 'TRUST'] as const;

type StatementsPageProps = {
  searchParams: Promise<{ type?: string; subject?: string }>;
};

export default async function StatementsPage({ searchParams }: StatementsPageProps) {
  const filters = await searchParams;
  return (
    <Suspense fallback={<Skel />}>
      <Content {...filters} />
    </Suspense>
  );
}

async function Content({ type, subject }: { type?: string; subject?: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };

  const parsedType = TYPES.includes((type ?? 'ALL') as (typeof TYPES)[number])
    ? (type as (typeof TYPES)[number])
    : 'ALL';

  const statements = await listStatements(ctx, {
    type: parsedType !== 'ALL' ? (parsedType as StatementType) : undefined,
    subjectId: subject || undefined,
  });

  const tenantIds = Array.from(new Set(statements.filter((s) => s.subjectType === 'Tenant').map((s) => s.subjectId)));
  const landlordIds = Array.from(new Set(statements.filter((s) => s.subjectType === 'Landlord').map((s) => s.subjectId)));
  const [tenants, landlords] = await Promise.all([
    tenantIds.length ? db.tenant.findMany({ where: { id: { in: tenantIds }, orgId: ctx.orgId }, select: { id: true, firstName: true, lastName: true } }) : [],
    landlordIds.length ? db.landlord.findMany({ where: { id: { in: landlordIds }, orgId: ctx.orgId }, select: { id: true, name: true } }) : [],
  ]);
  const tenantMap = new Map(tenants.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));
  const landlordMap = new Map(landlords.map((l) => [l.id, l.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Statements"
        description="Tenant ledgers, landlord ledgers, and trust statements. Generate on demand from a tenant or landlord page."
      />

      <Card>
        <CardContent className="p-4">
          <form action="/statements" className="flex flex-wrap items-end gap-3 text-sm">
            <div className="flex flex-wrap gap-1">
              {TYPES.map((t) => {
                const active = parsedType === t;
                const href = t === 'ALL' ? '/statements' : `/statements?type=${t}`;
                return (
                  <Link
                    key={t}
                    href={href}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium',
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t}
                  </Link>
                );
              })}
            </div>
            <label className="text-xs text-muted-foreground">
              Subject id
              <input
                type="text"
                name="subject"
                defaultValue={subject ?? ''}
                placeholder="Tenant or landlord id"
                className="ml-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs"
              />
            </label>
            {parsedType !== 'ALL' ? <input type="hidden" name="type" value={parsedType} /> : null}
            <button type="submit" className="rounded-lg border border-border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80">
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate</CardTitle>
          <CardDescription>Open a tenant or landlord page to generate a statement against the right subject.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link href="/tenants" className="rounded-lg border border-border bg-muted/30 px-3 py-2 hover:bg-muted">
            Pick a tenant →
          </Link>
          <Link href="/trust" className="rounded-lg border border-border bg-muted/30 px-3 py-2 hover:bg-muted">
            Pick a landlord →
          </Link>
        </CardContent>
      </Card>

      {statements.length === 0 ? (
        <EmptyState title="No statements yet" description="Generate one from a tenant or landlord detail page to populate this list." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Generated</TableHead>
                <TableHead className="px-4 py-3">Type</TableHead>
                <TableHead className="px-4 py-3">Subject</TableHead>
                <TableHead className="px-4 py-3">Period</TableHead>
                <TableHead className="px-4 py-3 text-right">Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {statements.map((s) => {
                const subjectName = s.subjectType === 'Tenant'
                  ? tenantMap.get(s.subjectId) ?? s.subjectId
                  : landlordMap.get(s.subjectId) ?? s.subjectId;
                return (
                  <TableRow key={s.id} className="even:bg-muted/15 hover:bg-muted/40">
                    <TableCell className="px-4 py-3">
                      <Link href={`/statements/${s.id}`} className="font-medium text-foreground hover:text-primary">
                        {formatDate(s.generatedAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{s.type}</TableCell>
                    <TableCell className="px-4 py-3">{subjectName}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {formatDate(s.periodStart)} → {formatDate(s.periodEnd)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-serif">{formatZar(s.closingBalanceCents)}</TableCell>
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
