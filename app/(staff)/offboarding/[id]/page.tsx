import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getOffboardingCase } from '@/lib/services/offboarding';
import { formatDate, formatZar } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OffboardingTaskToggle } from '@/components/forms/offboarding-task-toggle';
import { MoveOutChargeForm, RemoveChargeButton } from '@/components/forms/move-out-charge-form';
import { FinaliseSettlementButton } from '@/components/forms/finalise-settlement-button';
import { CloseCaseButton } from '@/components/forms/close-case-button';

export default async function OffboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <OffboardingDetail id={id} />
    </Suspense>
  );
}

async function OffboardingDetail({ id }: { id: string }) {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };

  let kase: Awaited<ReturnType<typeof getOffboardingCase>>;
  try {
    kase = await getOffboardingCase(ctx, id);
  } catch {
    notFound();
  }

  const finalised = Boolean(kase.settlement?.finalizedAt);
  const tenantTotal = kase.charges
    .filter((c) => c.responsibility === 'TENANT')
    .reduce((sum, c) => sum + c.amountCents, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/offboarding"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to offboarding
      </Link>
      <PageHeader
        eyebrow="Offboarding case"
        title={`Lease ${kase.leaseId.slice(-6)}`}
        description={`Opened ${formatDate(kase.openedAt)} · ${kase.status}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {kase.tasks.map((t) => (
            <OffboardingTaskToggle
              key={t.id}
              caseId={kase.id}
              taskId={t.id}
              initialDone={t.done}
              label={t.label}
              disabled={finalised}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Charges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {kase.charges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No move-out charges captured.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {kase.charges.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.responsibility} · {formatZar(c.amountCents)}
                    </div>
                  </div>
                  <RemoveChargeButton caseId={kase.id} chargeId={c.id} disabled={finalised} />
                </li>
              ))}
            </ul>
          )}
          {!finalised ? <MoveOutChargeForm caseId={kase.id} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settlement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {finalised && kase.settlement ? (
            <>
              <Detail label="Deposit held" value={formatZar(kase.settlement.depositHeldCents)} />
              <Detail label="Charges applied" value={formatZar(kase.settlement.chargesAppliedCents)} />
              <Detail label="Refund due" value={formatZar(kase.settlement.refundDueCents)} />
              {kase.settlement.balanceOwedCents > 0 ? (
                <Detail
                  label="Balance owed by tenant"
                  value={<span className="text-destructive">{formatZar(kase.settlement.balanceOwedCents)}</span>}
                />
              ) : null}
              {kase.settlement.statementKey ? (
                <a
                  href={kase.settlement.statementKey}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Open settlement statement PDF
                </a>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Finalised {kase.settlement.finalizedAt ? formatDate(kase.settlement.finalizedAt) : '—'}
              </p>
              {kase.status !== 'CLOSED' ? <CloseCaseButton caseId={kase.id} /> : null}
            </>
          ) : (
            <>
              <Detail label="Tenant-borne charges" value={formatZar(tenantTotal)} />
              <p className="text-xs text-muted-foreground">
                Finalising will compute the refund and write a DEPOSIT_OUT ledger entry. This is irreversible.
              </p>
              <FinaliseSettlementButton caseId={kase.id} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 pb-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
