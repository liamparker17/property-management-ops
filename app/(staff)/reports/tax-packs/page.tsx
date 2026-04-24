import Link from 'next/link';
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
import { formatDate, formatZar } from '@/lib/format';
import { formatFinancialYearLabel } from '@/lib/financial-year';
import {
  generateLandlordTaxPack,
  generateTenantTaxPack,
  listPacksForYear,
  regenerateTaxPackCsv,
  regenerateTaxPackPdf,
} from '@/lib/services/tax-reporting';

type Props = {
  searchParams: Promise<{ yearId?: string; tab?: string }>;
};

export default async function StaffTaxPacksPage({ searchParams }: Props) {
  const filters = await searchParams;
  const session = await auth();
  if (!session) redirect('/login');
  if (!['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  const ctx = userToRouteCtx(session.user);
  const [years, landlords, tenants] = await Promise.all([
    db.financialYear.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { startDate: 'desc' },
    }),
    db.landlord.findMany({
      where: { orgId: ctx.orgId, archivedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    db.tenant.findMany({
      where: { orgId: ctx.orgId, archivedAt: null },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const selectedYear = years.find((year) => year.id === filters.yearId) ?? years[0] ?? null;
  const selectedTab = filters.tab === 'tenants' ? 'tenants' : 'landlords';
  const packs = selectedYear ? await listPacksForYear(ctx, selectedYear.id) : [];
  const landlordMap = new Map(landlords.map((landlord) => [landlord.id, landlord.name]));
  const tenantMap = new Map(tenants.map((tenant) => [tenant.id, `${tenant.firstName} ${tenant.lastName}`.trim()]));

  async function generateLandlordAction(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    await generateLandlordTaxPack(
      userToRouteCtx(session.user),
      String(formData.get('subjectId')),
      String(formData.get('yearId')),
      { transmissionAdapter: 'recordOnly' },
    );
    revalidatePath('/reports/tax-packs');
  }

  async function generateTenantAction(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    await generateTenantTaxPack(
      userToRouteCtx(session.user),
      String(formData.get('subjectId')),
      String(formData.get('yearId')),
      { transmissionAdapter: 'recordOnly' },
    );
    revalidatePath('/reports/tax-packs');
  }

  async function regeneratePdfAction(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    await regenerateTaxPackPdf(userToRouteCtx(session.user), String(formData.get('packId')));
    revalidatePath('/reports/tax-packs');
  }

  async function regenerateCsvAction(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session) redirect('/login');
    await regenerateTaxPackCsv(userToRouteCtx(session.user), String(formData.get('packId')));
    revalidatePath('/reports/tax-packs');
  }

  const rows = packs.filter((pack) => pack.subjectType === (selectedTab === 'landlords' ? 'Landlord' : 'Tenant'));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Tax packs"
        description="Generate accountant-ready PDF and CSV support packs for landlords and tenants."
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            {years.map((year) => (
              <Link
                key={year.id}
                href={`/reports/tax-packs?yearId=${year.id}&tab=${selectedTab}`}
                className={buttonVariants({
                  variant: selectedYear?.id === year.id ? 'default' : 'outline',
                  size: 'sm',
                })}
              >
                {formatFinancialYearLabel(year.startDate)}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Link
              href={`/reports/tax-packs?yearId=${selectedYear?.id ?? ''}&tab=landlords`}
              className={buttonVariants({ variant: selectedTab === 'landlords' ? 'default' : 'outline', size: 'sm' })}
            >
              Landlords
            </Link>
            <Link
              href={`/reports/tax-packs?yearId=${selectedYear?.id ?? ''}&tab=tenants`}
              className={buttonVariants({ variant: selectedTab === 'tenants' ? 'default' : 'outline', size: 'sm' })}
            >
              Tenants
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate {selectedTab}</CardTitle>
            <CardDescription>All new packs default to the `recordOnly` transmission adapter for M5.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedYear ? (
              selectedTab === 'landlords' ? (
                <SubjectPackForm
                  action={generateLandlordAction}
                  year={selectedYear}
                  subjects={landlords.map((landlord) => ({ id: landlord.id, label: landlord.name }))}
                />
              ) : (
                <SubjectPackForm
                  action={generateTenantAction}
                  year={selectedYear}
                  subjects={tenants.map((tenant) => ({
                    id: tenant.id,
                    label: `${tenant.firstName} ${tenant.lastName}`.trim(),
                  }))}
                />
              )
            ) : (
              <EmptyState title="No financial year available" description="Open a year first, then generate tax packs against it." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated packs</CardTitle>
            <CardDescription>
              {selectedYear ? `Showing ${formatFinancialYearLabel(selectedYear.startDate)} ${selectedTab}.` : 'Pick a year to view packs.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedYear ? (
              <EmptyState title="No year selected" description="Open or select a financial year to view tax packs." />
            ) : rows.length === 0 ? (
              <EmptyState title="No packs yet" description="Generate the first pack from the form on this page." />
            ) : (
              <Card className="overflow-hidden p-0">
                <Table>
                  <TableHeader className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="px-4 py-3">Subject</TableHead>
                      <TableHead className="px-4 py-3">Generated</TableHead>
                      <TableHead className="px-4 py-3">Net</TableHead>
                      <TableHead className="px-4 py-3">Status</TableHead>
                      <TableHead className="px-4 py-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/60">
                    {rows.map((pack) => {
                      const totals = pack.totalsJson as { netCents?: number };
                      const label =
                        pack.subjectType === 'Landlord'
                          ? landlordMap.get(pack.subjectId) ?? pack.subjectId
                          : tenantMap.get(pack.subjectId) ?? pack.subjectId;
                      return (
                        <TableRow key={pack.id} className="even:bg-muted/15 hover:bg-muted/40">
                          <TableCell className="px-4 py-3 font-medium">{label}</TableCell>
                          <TableCell className="px-4 py-3 text-muted-foreground">
                            {formatDate(pack.generatedAt)}
                            {pack.regeneratedAt ? ` · regen ${formatDate(pack.regeneratedAt)}` : ''}
                          </TableCell>
                          <TableCell className="px-4 py-3">{formatZar(totals.netCents ?? 0)}</TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant={pack.regeneratedAt ? 'secondary' : 'outline'}>
                              {pack.regeneratedAt ? `Regen x${pack.regenerationCount}` : 'Fresh'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <a href={`/api/reports/tax-packs/${pack.id}/pdf`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                View PDF
                              </a>
                              <a href={`/api/reports/tax-packs/${pack.id}/csv`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                Download CSV
                              </a>
                              {session.user.role !== 'FINANCE' ? (
                                <>
                                  <form action={regeneratePdfAction}>
                                    <input type="hidden" name="packId" value={pack.id} />
                                    <button type="submit" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                      Regenerate PDF
                                    </button>
                                  </form>
                                  <form action={regenerateCsvAction}>
                                    <input type="hidden" name="packId" value={pack.id} />
                                    <button type="submit" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                                      Regenerate CSV
                                    </button>
                                  </form>
                                </>
                              ) : null}
                            </div>
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
    </div>
  );
}

function SubjectPackForm({
  action,
  year,
  subjects,
}: {
  action: (formData: FormData) => Promise<void>;
  year: { id: string; startDate: Date };
  subjects: Array<{ id: string; label: string }>;
}) {
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="yearId" value={year.id} />
      <div className="rounded-xl border border-border p-4">
        <p className="text-sm text-muted-foreground">Year</p>
        <p className="font-medium">{formatFinancialYearLabel(year.startDate)}</p>
      </div>
      <label className="block text-sm text-muted-foreground">
        Subject
        <select name="subjectId" className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm">
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={buttonVariants({ variant: 'outline' })}>
        Generate pack
      </button>
    </form>
  );
}
