import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { getBillingRun } from '@/lib/services/billing';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Prisma } from '@prisma/client';

import { InvoiceRow } from './invoice-row';
import { PublishRunButton } from './publish-button';

function statusTone(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400';
    case 'READY':
      return 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300';
    case 'FAILED':
      return 'bg-destructive/10 text-destructive ring-destructive/25';
    default:
      return 'bg-muted text-muted-foreground ring-border';
  }
}

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset ${statusTone(value)}`}
    >
      <span className="h-2 w-2 rounded-full bg-current/70" />
      {value}
    </span>
  );
}

type BillingRunDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BillingRunDetailPage({ params }: BillingRunDetailPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<RunDetailSkeleton />}>
      <RunDetailContent id={id} />
    </Suspense>
  );
}

async function RunDetailContent({ id }: { id: string }) {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }
  const ctx = { orgId: session.user.orgId, userId: session.user.id, role };
  const run = await getBillingRun(ctx, id);

  const feature = await db.orgFeature.findUnique({
    where: { orgId_key: { orgId: ctx.orgId, key: 'UTILITIES_BILLING' } },
    select: { config: true },
  });
  const cfg = (feature?.config ?? null) as { allowEstimates?: boolean } | null;
  const allowEstimates = cfg?.allowEstimates === true;

  const invoicesWithEstimates = run.invoices.filter((inv) =>
    inv.lineItems.some((l) => l.estimated),
  );
  const hasEstimates = invoicesWithEstimates.length > 0;
  const publishBlocked = run.status === 'PUBLISHED' || (hasEstimates && !allowEstimates);
  const publishBlockedReason = run.status === 'PUBLISHED'
    ? 'This run is already published.'
    : hasEstimates && !allowEstimates
      ? 'Run contains estimated line items. Enable UTILITIES_BILLING.allowEstimates to publish.'
      : null;

  const period = `${run.periodStart.getUTCFullYear()}-${String(run.periodStart.getUTCMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/billing" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to billing
        </Link>
      </div>

      <PageHeader
        eyebrow={`Billing · ${period}`}
        title={`Run ${period}`}
        description={`${run.invoices.length} invoices · created ${formatDate(run.createdAt)}${run.publishedAt ? ` · published ${formatDate(run.publishedAt)}` : ''}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusPill value={run.status} />
            <PublishRunButton runId={run.id} disabled={publishBlocked} disabledReason={publishBlockedReason} />
          </div>
        }
      />

      {hasEstimates ? (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-300">
            {invoicesWithEstimates.length} invoice{invoicesWithEstimates.length === 1 ? '' : 's'} include estimated readings.
          </p>
          <p className="mt-1 text-muted-foreground">
            Estimates mean the meter reading for this period was missing; the engine used a rolling average or rollover. Review
            the affected invoices before publishing.
          </p>
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="px-4 py-3 text-left">Unit</th>
              <th className="px-4 py-3 text-left">Period</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Flags</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {run.invoices.map((inv) => {
              const label = `${inv.lease.unit.property.name} · ${inv.lease.unit.label}`;
              return (
                <InvoiceRow
                  key={inv.id}
                  invoiceId={inv.id}
                  propertyLabel={label}
                  periodStart={inv.periodStart}
                  totalCents={inv.totalCents || inv.amountCents}
                  status={inv.status}
                  hasEstimates={inv.lineItems.some((l) => l.estimated)}
                  lineItems={inv.lineItems.map((l) => ({
                    id: l.id,
                    kind: l.kind,
                    description: l.description,
                    quantity: l.quantity != null ? (l.quantity as Prisma.Decimal).toString() : null,
                    unitRateCents: l.unitRateCents,
                    amountCents: l.amountCents,
                    estimated: l.estimated,
                  }))}
                />
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function RunDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
