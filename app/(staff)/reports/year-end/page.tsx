import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import {
  currentFinancialYear,
  FINANCIAL_YEAR_START,
  formatFinancialYearLabel,
} from '@/lib/financial-year';
import { generateAnnualReconciliation, lockYear, openYear } from '@/lib/services/year-end';

function nextStartDate(existingStarts: Date[]): string {
  if (existingStarts.length === 0) {
    return formatDate(currentFinancialYear().startDate);
  }
  const latest = existingStarts
    .slice()
    .sort((a, b) => b.getTime() - a.getTime())[0];
  return formatDate(
    new Date(Date.UTC(latest.getUTCFullYear() + 1, FINANCIAL_YEAR_START.month - 1, FINANCIAL_YEAR_START.day)),
  );
}

export default async function StaffYearEndPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (!['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const ctx = userToRouteCtx(session.user);
  const [years, properties, landlords, reconciliations] = await Promise.all([
    db.financialYear.findMany({
      where: { orgId: ctx.orgId },
      include: { lockedBy: { select: { email: true, name: true } } },
      orderBy: { startDate: 'desc' },
    }),
    db.property.findMany({
      where: { orgId: ctx.orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.landlord.findMany({
      where: { orgId: ctx.orgId, archivedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.annualReconciliation.findMany({
      where: { orgId: ctx.orgId },
      orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }],
      take: 12,
    }),
  ]);

  async function openYearAction(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    await openYear(userToRouteCtx(session.user), {
      startDate: new Date(String(formData.get('startDate'))),
    });
    revalidatePath('/reports/year-end');
  }

  async function lockYearAction(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    await lockYear(userToRouteCtx(session.user), String(formData.get('yearId')));
    revalidatePath('/reports/year-end');
  }

  async function reconAction(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    const scopeType = String(formData.get('scopeType'));
    const scopeId = String(formData.get('scopeId') || '');
    await generateAnnualReconciliation(userToRouteCtx(session.user), String(formData.get('yearId')), scopeType === 'ORG'
      ? { type: 'ORG' }
      : scopeType === 'PROPERTY'
        ? { type: 'PROPERTY', id: scopeId }
        : { type: 'LANDLORD', id: scopeId });
    revalidatePath('/reports/year-end');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Year-end"
        description="Open financial years, lock completed years, and generate annual reconciliation snapshots by org, property, or landlord scope."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial years</CardTitle>
            <CardDescription>All years use the fixed South African tax window: 1 March to end-February.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={openYearAction} className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-muted-foreground">
                Start date
                <input
                  type="date"
                  name="startDate"
                  defaultValue={nextStartDate(years.map((year) => year.startDate))}
                  className="ml-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </label>
              {(session.user.role === 'ADMIN' || session.user.role === 'PROPERTY_MANAGER') ? (
                <button type="submit" className={buttonVariants({ variant: 'outline' })}>
                  Open new year
                </button>
              ) : null}
            </form>

            {years.length === 0 ? (
              <EmptyState title="No financial years yet" description="Open the first year to start year-end reporting." />
            ) : (
              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="px-4 py-3">Year</TableHead>
                      <TableHead className="px-4 py-3">Range</TableHead>
                      <TableHead className="px-4 py-3">Status</TableHead>
                      <TableHead className="px-4 py-3">Locked by</TableHead>
                      <TableHead className="px-4 py-3 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {years.map((year) => (
                      <TableRow key={year.id} className="even:bg-muted/15 hover:bg-muted/40">
                        <TableCell className="px-4 py-3 font-medium">
                          {formatFinancialYearLabel(year.startDate)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {formatDate(year.startDate)} → {formatDate(year.endDate)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant={year.lockedAt ? 'secondary' : 'outline'}>
                            {year.lockedAt ? 'Locked' : 'Open'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {year.lockedBy?.name ?? year.lockedBy?.email ?? '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          {session.user.role === 'ADMIN' && !year.lockedAt ? (
                            <form action={lockYearAction}>
                              <input type="hidden" name="yearId" value={year.id} />
                              <button type="submit" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                Lock year
                              </button>
                            </form>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate reconciliation</CardTitle>
            <CardDescription>Snapshot the year by organisation, property, or landlord scope.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ReconForm
              action={reconAction}
              title="Organisation"
              scopeType="ORG"
              years={years}
            />
            <ReconForm
              action={reconAction}
              title="Property"
              scopeType="PROPERTY"
              years={years}
              options={properties.map((property) => ({ id: property.id, label: property.name }))}
            />
            <ReconForm
              action={reconAction}
              title="Landlord"
              scopeType="LANDLORD"
              years={years}
              options={landlords.map((landlord) => ({ id: landlord.id, label: landlord.name }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent annual reconciliations</CardTitle>
          <CardDescription>Latest generated snapshots across available scopes.</CardDescription>
        </CardHeader>
        <CardContent>
          {reconciliations.length === 0 ? (
            <EmptyState title="No reconciliations yet" description="Generate a reconciliation to populate this list." />
          ) : (
            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="px-4 py-3">Generated</TableHead>
                    <TableHead className="px-4 py-3">Scope</TableHead>
                    <TableHead className="px-4 py-3">Year</TableHead>
                    <TableHead className="px-4 py-3">Storage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {reconciliations.map((row) => {
                    const year = years.find((item) => item.id === row.yearId);
                    return (
                      <TableRow key={row.id} className="even:bg-muted/15 hover:bg-muted/40">
                        <TableCell className="px-4 py-3">{formatDate(row.generatedAt)}</TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {row.scopeType}{row.scopeId ? ` · ${row.scopeId}` : ''}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {year ? formatFinancialYearLabel(year.startDate) : row.yearId}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground">
                          {row.storageKey ?? 'Inline summary only'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReconForm({
  action,
  title,
  scopeType,
  years,
  options,
}: {
  action: (formData: FormData) => Promise<void>;
  title: string;
  scopeType: 'ORG' | 'PROPERTY' | 'LANDLORD';
  years: Array<{ id: string; startDate: Date }>;
  options?: Array<{ id: string; label: string }>;
}) {
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">Generate a fresh annual summary for this scope.</p>
      </div>
      <input type="hidden" name="scopeType" value={scopeType} />
      <label className="block text-sm text-muted-foreground">
        Year
        <select name="yearId" className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {formatFinancialYearLabel(year.startDate)}
            </option>
          ))}
        </select>
      </label>
      {scopeType !== 'ORG' ? (
        <label className="block text-sm text-muted-foreground">
          {title}
          <select name="scopeId" className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
            {options?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button type="submit" className={buttonVariants({ variant: 'outline' })}>
        Generate {title.toLowerCase()} recon
      </button>
    </form>
  );
}
