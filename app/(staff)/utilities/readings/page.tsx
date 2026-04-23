import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Prisma } from '@prisma/client';

const UTILITY_TYPES = ['ALL', 'WATER', 'ELECTRICITY', 'GAS', 'SEWER', 'REFUSE', 'OTHER'] as const;

type ReadingsPageProps = {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
};

export default async function ReadingsPage({ searchParams }: ReadingsPageProps) {
  const filters = await searchParams;
  return (
    <Suspense fallback={<ReadingsSkeleton />}>
      <ReadingsContent {...filters} />
    </Suspense>
  );
}

async function ReadingsContent({ type, from, to }: { type?: string; from?: string; to?: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }

  const parsedType = UTILITY_TYPES.includes((type ?? 'ALL') as (typeof UTILITY_TYPES)[number])
    ? (type as (typeof UTILITY_TYPES)[number])
    : 'ALL';

  const readings = await db.meterReading.findMany({
    where: {
      meter: {
        orgId: session.user.orgId,
        ...(parsedType !== 'ALL' ? { type: parsedType as 'WATER' } : {}),
      },
      ...(from ? { takenAt: { gte: new Date(from) } } : {}),
      ...(to ? { takenAt: { ...(from ? { gte: new Date(from) } : {}), lte: new Date(to) } } : {}),
    },
    include: {
      meter: {
        include: { unit: { include: { property: { select: { name: true } } } } },
      },
    },
    orderBy: { takenAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Utilities"
        title="Readings"
        description={`${readings.length} ${readings.length === 1 ? 'reading' : 'readings'} in view.`}
      />

      <Card>
        <CardContent className="p-4">
          <form action="/utilities/readings" className="flex flex-wrap items-end gap-3 text-sm">
            <div className="flex flex-wrap gap-1">
              {UTILITY_TYPES.map((t) => {
                const active = parsedType === t;
                const href = t === 'ALL' ? '/utilities/readings' : `/utilities/readings?type=${t}`;
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
              From
              <input
                type="date"
                name="from"
                defaultValue={from ?? ''}
                className="ml-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              To
              <input
                type="date"
                name="to"
                defaultValue={to ?? ''}
                className="ml-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs"
              />
            </label>
            {parsedType !== 'ALL' ? <input type="hidden" name="type" value={parsedType} /> : null}
            <button
              type="submit"
              className="rounded-lg border border-border bg-muted px-3 py-1 text-xs font-medium hover:bg-muted/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {readings.length === 0 ? (
        <EmptyState title="No readings match these filters" description="Try widening the date range or clearing filters." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Date</TableHead>
                <TableHead className="px-4 py-3">Property / Unit</TableHead>
                <TableHead className="px-4 py-3">Type</TableHead>
                <TableHead className="px-4 py-3">Reading</TableHead>
                <TableHead className="px-4 py-3">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {readings.map((r) => (
                <TableRow key={r.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">{formatDate(r.takenAt)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <Link href={`/utilities/meters/${r.meterId}`} className="font-medium text-foreground hover:text-primary">
                      {r.meter.unit.property.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.meter.unit.label}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {r.meter.type}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-serif">{(r.readingValue as Prisma.Decimal).toString()}</TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {r.source}
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

function ReadingsSkeleton() {
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
