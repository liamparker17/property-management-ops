import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { listTariffs } from '@/lib/services/utilities';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UtilityTariffForm } from '@/components/forms/utility-tariff-form';

export default async function TariffsPage() {
  return (
    <Suspense fallback={<TariffsSkeleton />}>
      <TariffsContent />
    </Suspense>
  );
}

async function TariffsContent() {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };

  const [tariffs, properties] = await Promise.all([
    listTariffs(ctx, {}),
    db.property.findMany({
      where: { orgId: ctx.orgId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const propertyNameById = new Map(properties.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Utilities"
        title="Tariffs"
        description="Set the org-wide default per utility type; override per property when local rates differ."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add or update tariff</CardTitle>
        </CardHeader>
        <CardContent>
          <UtilityTariffForm properties={properties} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="px-4 py-3">Type</TableHead>
              <TableHead className="px-4 py-3">Scope</TableHead>
              <TableHead className="px-4 py-3">Structure</TableHead>
              <TableHead className="px-4 py-3">Unit rate</TableHead>
              <TableHead className="px-4 py-3">Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {tariffs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">No tariffs defined yet.</TableCell></TableRow>
            ) : (
              tariffs.map((t) => (
                <TableRow key={t.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">{t.type}</TableCell>
                  <TableCell className="px-4 py-3">
                    {t.propertyId ? propertyNameById.get(t.propertyId) ?? 'Property' : 'Org-wide default'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">{t.structure}</TableCell>
                  <TableCell className="px-4 py-3 font-serif">
                    {t.flatUnitRateCents != null ? formatZar(t.flatUnitRateCents) : 'Tiered'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(t.effectiveFrom)} → {t.effectiveTo ? formatDate(t.effectiveTo) : '∞'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function TariffsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Card className="p-6"><Skeleton className="h-32 w-full" /></Card>
      <Card className="p-6"><Skeleton className="h-48 w-full" /></Card>
    </div>
  );
}
