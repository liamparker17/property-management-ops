import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Coins, Wallet, Calendar, FileText, FileType, RotateCcw } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getLease } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate, formatZar } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { listLeaseInvoices } from '@/lib/services/invoices';
import { db } from '@/lib/db';

import { LeaseActions } from './actions';
import { DocumentUpload } from './document-upload';
import { InvoicesPanel } from './invoices-panel';
import { SignaturesPanel } from './signatures-panel';

export default async function LeaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let lease;
  try {
    lease = await getLease(ctx, id);
  } catch {
    notFound();
  }

  const primary = lease.tenants.find((t) => t.isPrimary)?.tenant;
  const coTenants = lease.tenants.filter((t) => !t.isPrimary).map((t) => t.tenant);

  const signatures = await db.leaseSignature.findMany({
    where: { leaseId: lease.id },
    orderBy: { signedAt: 'desc' },
  });
  const reviewRequests = await db.leaseReviewRequest.findMany({
    where: { leaseId: lease.id },
    orderBy: { createdAt: 'desc' },
  });
  const tenantIds = Array.from(new Set([...signatures.map((s) => s.tenantId), ...reviewRequests.map((r) => r.tenantId)]));
  const tenants = tenantIds.length
    ? await db.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const tenantNameMap = Object.fromEntries(tenants.map((t) => [t.id, `${t.firstName} ${t.lastName}`]));
  const reviewRequestsWithTenant = reviewRequests.map((r) => ({
    ...r,
    tenant: tenants.find((t) => t.id === r.tenantId) ?? null,
  }));

  const showInvoices = lease.state === 'ACTIVE' || lease.state === 'RENEWED';
  const rawInvoices = showInvoices ? await listLeaseInvoices(ctx, lease.id) : [];
  const invoices = rawInvoices.map((i) => ({
    id: i.id,
    periodStart: i.periodStart.toISOString(),
    dueDate: i.dueDate.toISOString(),
    amountCents: i.amountCents,
    status: i.status,
    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
    paidAmountCents: i.paidAmountCents,
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href={`/units/${lease.unit.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {lease.unit.property.name} · {lease.unit.label}
        </Link>
        <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lease</div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
              {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
            </h1>
            <LeaseStatusBadge status={lease.status} />
          </div>
          <LeaseActions id={lease.id} state={lease.state} />
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Detail icon={<Coins />} label="Rent" value={formatZar(lease.rentAmountCents)} tone="emerald" />
          <Detail
            icon={<Wallet />}
            label="Deposit"
            value={`${formatZar(lease.depositAmountCents)}${lease.heldInTrustAccount ? ' (trust)' : ''}`}
            tone="violet"
          />
          <Detail icon={<Calendar />} label="Due day" value={`${lease.paymentDueDay}`} tone="sky" />
          {lease.terminatedAt && (
            <Detail
              icon={<FileText />}
              label="Terminated"
              value={`${formatDate(lease.terminatedAt)} — ${lease.terminatedReason ?? ''}`}
              tone="amber"
            />
          )}
          {lease.renewedFrom && (
            <Detail
              icon={<RotateCcw />}
              label="Renewed from"
              value={
                <Link href={`/leases/${lease.renewedFrom.id}`} className="hover:underline">
                  {formatDate(lease.renewedFrom.startDate)} → {formatDate(lease.renewedFrom.endDate)}
                </Link>
              }
              tone="violet"
            />
          )}
          {lease.renewedTo && (
            <Detail
              icon={<RotateCcw />}
              label="Renewed to"
              value={
                <Link href={`/leases/${lease.renewedTo.id}`} className="hover:underline">
                  {formatDate(lease.renewedTo.startDate)} → {formatDate(lease.renewedTo.endDate)}
                </Link>
              }
              tone="violet"
            />
          )}
        </CardContent>
      </Card>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Tenants</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {primary && (
            <TenantRow tenant={primary} role="Primary" tone="primary" />
          )}
          {coTenants.map((t) => (
            <TenantRow key={t.id} tenant={t} role="Co-tenant" tone="muted" />
          ))}
        </ul>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Lease agreement</h2>
        {lease.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agreement uploaded.</p>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border/60">
              {lease.documents.map((d) => (
                <li key={d.id}>
                  <a
                    href={`/api/documents/${d.id}/download`}
                    className="group flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <FileType className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                        {d.filename}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(d.sizeBytes / 1024).toFixed(0)} KB
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <DocumentUpload leaseId={lease.id} />
      </section>

      {showInvoices && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Invoices</h2>
            <InvoicesPanel invoices={invoices} />
          </section>
        </>
      )}

      <Separator />

      <section>
        <SignaturesPanel
          signatures={signatures}
          reviewRequests={reviewRequestsWithTenant}
          tenantNameMap={tenantNameMap}
        />
      </section>
    </div>
  );
}

const DETAIL_TONE = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
} as const;

function Detail({
  icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: keyof typeof DETAIL_TONE;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${DETAIL_TONE[tone]} [&_svg]:size-4`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function TenantRow({
  tenant,
  role,
  tone,
}: {
  tenant: { id: string; firstName: string; lastName: string };
  role: string;
  tone: 'primary' | 'muted';
}) {
  return (
    <li>
      <Link
        href={`/tenants/${tenant.id}`}
        className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm transition-all hover:-translate-y-px hover:border-primary/30 hover:shadow-card"
      >
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
            tone === 'primary'
              ? 'bg-gradient-to-br from-primary/15 to-primary/5 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {initials(tenant.firstName, tenant.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground transition-colors group-hover:text-primary">
            {tenant.firstName} {tenant.lastName}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{role}</div>
        </div>
      </Link>
    </li>
  );
}
