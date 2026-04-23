import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Gauge, Plus } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { listMeters } from '@/lib/services/utilities';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const UTILITY_TYPES = ['ALL', 'WATER', 'ELECTRICITY', 'GAS', 'SEWER', 'REFUSE', 'OTHER'] as const;

type MetersPageProps = {
  searchParams: Promise<{ type?: string; unitId?: string }>;
};

export default async function MetersIndexPage({ searchParams }: MetersPageProps) {
  const filters = await searchParams;
  return (
    <Suspense fallback={<MetersSkeleton />}>
      <MetersContent type={filters.type} unitId={filters.unitId} />
    </Suspense>
  );
}

async function MetersContent({ type, unitId }: { type?: string; unitId?: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };

  const parsedType = UTILITY_TYPES.includes((type ?? 'ALL') as (typeof UTILITY_TYPES)[number])
    ? (type as (typeof UTILITY_TYPES)[number])
    : 'ALL';

  const meters = await listMeters(ctx, {
    type: parsedType !== 'ALL' ? (parsedType as 'WATER' | 'ELECTRICITY' | 'GAS' | 'SEWER' | 'REFUSE' | 'OTHER') : undefined,
    unitId,
  });

  const unitIds = Array.from(new Set(meters.map((m) => m.unitId)));
  const units = unitIds.length
    ? await db.unit.findMany({
        where: { id: { in: unitIds }, orgId: ctx.orgId },
        select: { id: true, label: true, property: { select: { id: true, name: true } } },
      })
    : [];
  const unitMap = new Map(units.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Utilities"
        title="Meters"
        description={`${meters.length} ${meters.length === 1 ? 'meter' : 'meters'} across the portfolio.`}
        actions={
          <Link href="/utilities/meters/new" className={cn(buttonVariants(), 'gap-1.5')}>
            <Plus className="h-4 w-4" />
            New meter
          </Link>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap gap-1 rounded-lg p-4">
          {UTILITY_TYPES.map((t) => {
            const active = parsedType === t;
            const href = t === 'ALL' ? '/utilities/meters' : `/utilities/meters?type=${t}`;
            return (
              <Link
                key={t}
                href={href}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {t}
              </Link>
            );
          })}
          <div className="ml-auto flex flex-wrap gap-2 text-xs">
            <Link href="/utilities/readings" className="text-muted-foreground hover:text-foreground">Readings</Link>
            <span className="text-border">·</span>
            <Link href="/utilities/tariffs" className="text-muted-foreground hover:text-foreground">Tariffs</Link>
          </div>
        </CardContent>
      </Card>

      {meters.length === 0 ? (
        <EmptyState
          icon={<Gauge className="size-5" />}
          title="No meters yet"
          description="Register meters against units to track consumption and produce utility line items on invoices."
          action={
            <Link href="/utilities/meters/new" className={cn(buttonVariants(), 'gap-1.5')}>
              <Plus className="h-4 w-4" />
              Add first meter
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Property</TableHead>
                <TableHead className="px-4 py-3">Unit</TableHead>
                <TableHead className="px-4 py-3">Type</TableHead>
                <TableHead className="px-4 py-3">Serial</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {meters.map((m) => {
                const unit = unitMap.get(m.unitId);
                return (
                  <TableRow key={m.id} className="even:bg-muted/15 hover:bg-muted/40">
                    <TableCell className="px-4 py-3">
                      <Link href={`/utilities/meters/${m.id}`} className="font-medium text-foreground hover:text-primary">
                        {unit?.property.name ?? 'Unknown'}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{unit?.label ?? '—'}</TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {m.type}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{m.serial ?? '—'}</TableCell>
                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                      {m.retiredAt ? 'Retired' : 'Active'}
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

function MetersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Card className="p-4"><Skeleton className="h-48 w-full" /></Card>
    </div>
  );
}
