import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { formatFinancialYearLabel } from '@/lib/financial-year';

export default async function TenantReportsPage() {
  const session = await auth();
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  const tenant = await db.tenant.findFirst({
    where: { orgId: session.user.orgId, userId: session.user.id },
    select: { id: true, orgId: true },
  });
  if (!tenant) redirect('/tenant');

  const packs = await db.taxPack.findMany({
    where: {
      orgId: tenant.orgId,
      subjectType: 'Tenant',
      subjectId: tenant.id,
    },
    include: { year: { select: { id: true, startDate: true, endDate: true } } },
    orderBy: { year: { startDate: 'desc' } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Portal"
        title="Reports"
        description="Annual payment and support-pack exports for your tenancy."
      />

      {packs.length === 0 ? (
        <EmptyState title="No reports yet" description="Tax support packs will appear here once your property manager publishes them." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Year</TableHead>
                <TableHead className="px-4 py-3">Range</TableHead>
                <TableHead className="px-4 py-3">Generated</TableHead>
                <TableHead className="px-4 py-3">Net</TableHead>
                <TableHead className="px-4 py-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {packs.map((pack) => {
                const totals = pack.totalsJson as { netCents?: number };
                return (
                  <TableRow key={pack.id} className="even:bg-muted/15 hover:bg-muted/40">
                    <TableCell className="px-4 py-3 font-medium">{formatFinancialYearLabel(pack.year.startDate)}</TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">
                      {formatDate(pack.year.startDate)} → {formatDate(pack.year.endDate)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{formatDate(pack.generatedAt)}</TableCell>
                    <TableCell className="px-4 py-3">{formatZar(totals.netCents ?? 0)}</TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Link href={`/tenant/reports/${pack.yearId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        Open report
                      </Link>
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
