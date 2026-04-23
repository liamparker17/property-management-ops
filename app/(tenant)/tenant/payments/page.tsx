import Link from 'next/link';
import { CreditCard, Landmark, Wallet } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { listTenantInvoices } from '@/lib/services/invoices';
import { getActiveLeaseForTenant } from '@/lib/services/tenant-portal';
import { DebiCheckCard } from './debicheck-card';
import { SelfManagedDebitOrderCard } from './self-managed-card';

export const dynamic = 'force-dynamic';

function mandateLabel(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'PENDING_SIGNATURE':
      return 'Awaiting signature';
    case 'REVOKED':
      return 'Revoked';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Not set up';
  }
}

export default async function TenantPaymentsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const activeLease = await getActiveLeaseForTenant(userId);

  if (!activeLease) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Billing"
          title="Payments"
          description="Set up and manage how you pay rent."
        />
        <EmptyState
          icon={<Wallet className="size-5" />}
          title="No active lease"
          description="Payment rails become available once your lease is active."
        />
      </div>
    );
  }

  const [mandate, invoices] = await Promise.all([
    db.debiCheckMandate.findUnique({
      where: { leaseId: activeLease.id },
      select: { status: true, upperCapCents: true, signedAt: true },
    }),
    listTenantInvoices(userId),
  ]);

  const nextUnpaid = invoices.find(
    (inv) => inv.leaseId === activeLease.id && inv.status !== 'PAID',
  );

  const mandateStatus = mandate?.status ?? 'NONE';
  const isMandateActive = mandateStatus === 'ACTIVE';
  const isSelfManagedActive = activeLease.selfManagedDebitOrderActive;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        description="Set up and manage how you pay rent for your active lease."
      />

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-[24px] font-light tracking-[-0.01em] text-foreground">
            Active payment methods
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {activeLease.unit.property.name} / {activeLease.unit.label}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center gap-2.5 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center border border-[color:var(--accent)]/25 text-[color:var(--accent)]">
                <Landmark className="h-4 w-4" />
              </div>
              <div className="flex flex-1 items-center justify-between gap-2">
                <CardTitle className="text-base">DebiCheck mandate</CardTitle>
                <Badge variant={isMandateActive ? 'default' : 'outline'} className="uppercase">
                  {mandateLabel(mandateStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              {mandate ? (
                <>
                  <p>
                    Upper cap: <span className="text-foreground">{formatZar(mandate.upperCapCents)}</span>
                  </p>
                  {mandate.signedAt ? <p>Signed {formatDate(mandate.signedAt)}</p> : null}
                </>
              ) : (
                <p>No DebiCheck mandate on file.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2.5 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center border border-[color:var(--accent)]/25 text-[color:var(--accent)]">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex flex-1 items-center justify-between gap-2">
                <CardTitle className="text-base">Self-managed debit order</CardTitle>
                <Badge variant={isSelfManagedActive ? 'default' : 'outline'} className="uppercase">
                  {isSelfManagedActive ? 'Active' : 'Not set up'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {isSelfManagedActive
                ? 'A debit order is running from your banking app.'
                : 'No self-managed debit order is marked active.'}
            </CardContent>
          </Card>
        </div>

        {nextUnpaid ? (
          <Card>
            <CardHeader className="flex-row items-center gap-2.5 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center border border-primary/20 text-primary">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex flex-1 items-center justify-between gap-2">
                <CardTitle className="text-base">Next unpaid invoice</CardTitle>
                <span className="font-serif text-[22px] font-light">
                  {formatZar(nextUnpaid.totalCents || nextUnpaid.amountCents)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Due {formatDate(nextUnpaid.dueDate)} — open the invoice to pay now.
              </p>
              <Link
                href={`/tenant/invoices/${nextUnpaid.id}`}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Open invoice
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No unpaid invoices right now.
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-[24px] font-light tracking-[-0.01em] text-foreground">
            Set up a new method
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Choose how you want to pay each month.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DebiCheckCard
            leaseId={activeLease.id}
            upperCapCents={
              mandate?.upperCapCents ?? Math.round(activeLease.rentAmountCents * 1.1)
            }
            initialStatus={mandateStatus as 'NONE' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'REVOKED' | 'FAILED'}
          />
          <SelfManagedDebitOrderCard
            leaseId={activeLease.id}
            initialActive={activeLease.selfManagedDebitOrderActive}
          />
        </div>
      </section>
    </div>
  );
}
