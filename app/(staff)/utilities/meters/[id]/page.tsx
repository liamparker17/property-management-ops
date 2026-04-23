import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { getMeter } from '@/lib/services/utilities';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MeterReadingForm } from '@/components/forms/meter-reading-form';
import { Prisma } from '@prisma/client';

type MeterDetailPageProps = { params: Promise<{ id: string }> };

export default async function MeterDetailPage({ params }: MeterDetailPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<MeterDetailSkeleton />}>
      <MeterDetailContent id={id} />
    </Suspense>
  );
}

async function MeterDetailContent({ id }: { id: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };
  const meter = await getMeter(ctx, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/utilities/meters" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to meters
        </Link>
      </div>
      <PageHeader
        eyebrow={`${meter.unit.property.name} · ${meter.unit.label}`}
        title={`${meter.type} meter`}
        description={`Serial ${meter.serial ?? '—'} · ${meter.retiredAt ? `Retired ${formatDate(meter.retiredAt)}` : 'Active'}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record reading</CardTitle>
        </CardHeader>
        <CardContent>
          {meter.retiredAt ? (
            <p className="text-sm text-muted-foreground">Meter is retired. No further readings can be recorded.</p>
          ) : (
            <MeterReadingForm meterId={meter.id} />
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="px-4 py-3">Date</TableHead>
              <TableHead className="px-4 py-3">Reading</TableHead>
              <TableHead className="px-4 py-3">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/60">
            {meter.readings.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">No readings yet.</TableCell></TableRow>
            ) : (
              meter.readings.map((r) => (
                <TableRow key={r.id} className="even:bg-muted/15 hover:bg-muted/40">
                  <TableCell className="px-4 py-3">{formatDate(r.takenAt)}</TableCell>
                  <TableCell className="px-4 py-3 font-serif">
                    {(r.readingValue as Prisma.Decimal).toString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {r.source}
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

function MeterDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-12 w-56" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
