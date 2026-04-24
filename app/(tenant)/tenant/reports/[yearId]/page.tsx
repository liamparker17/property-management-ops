import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatZar } from '@/lib/format';
import { formatFinancialYearLabel } from '@/lib/financial-year';

type Props = { params: Promise<{ yearId: string }> };

export default async function TenantReportDetailPage({ params }: Props) {
  const { yearId } = await params;
  const session = await auth();
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  const tenant = await db.tenant.findFirst({
    where: { orgId: session.user.orgId, userId: session.user.id },
    select: { id: true, orgId: true },
  });
  if (!tenant) redirect('/tenant/reports');

  const pack = await db.taxPack.findFirst({
    where: {
      orgId: tenant.orgId,
      subjectType: 'Tenant',
      subjectId: tenant.id,
      yearId,
    },
    include: { lines: true, year: true },
  });
  if (!pack) redirect('/tenant/reports');

  const totals = pack.totalsJson as {
    incomeCents?: number;
    expenseCents?: number;
    netCents?: number;
    depositMovementCents?: number;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant Portal"
        title={`Report ${formatFinancialYearLabel(pack.year.startDate)}`}
        description="Your accountant-ready payment summary and supporting exports."
        actions={
          <>
            <a href={`/api/reports/tax-packs/${pack.id}/pdf`} className={buttonVariants({ variant: 'outline' })}>
              Download PDF
            </a>
            <a href={`/api/reports/tax-packs/${pack.id}/csv`} className={buttonVariants({ variant: 'outline' })}>
              Download CSV
            </a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Charges" value={formatZar(totals.incomeCents ?? 0)} />
        <MetricCard label="Payments" value={formatZar(totals.expenseCents ?? 0)} />
        <MetricCard label="Net" value={formatZar(totals.netCents ?? 0)} />
        <MetricCard label="Deposit movement" value={formatZar(totals.depositMovementCents ?? 0)} />
      </div>

      {pack.lines.length === 0 ? (
        <EmptyState title="No lines available" description="This pack was generated without line items." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Category</TableHead>
                <TableHead className="px-4 py-3">Support type</TableHead>
                <TableHead className="px-4 py-3 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {pack.lines.map((line) => (
                <TableRow key={line.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3 font-medium">{line.category}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{line.subCategory ?? 'Summary'}</TableCell>
                  <TableCell className="px-4 py-3 text-right">{formatZar(line.amountCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-serif text-3xl font-light">{value}</p>
      </CardContent>
    </Card>
  );
}
