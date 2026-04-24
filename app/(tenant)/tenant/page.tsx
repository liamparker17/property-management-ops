import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { formatDate, formatZar } from '@/lib/format';
import { getTenantHomeView, getTenantNextAction } from '@/lib/services/tenant-analytics';

export default async function TenantHome() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const [view, nextAction] = await Promise.all([getTenantHomeView(ctx), getTenantNextAction(ctx)]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Tenant Portal"
        title="Home"
        description={
          view.activeLease
            ? `${view.activeLease.propertyName} / ${view.activeLease.unitLabel}`
            : 'Everything relevant to your tenancy.'
        }
      />

      {nextAction.kind !== 'NONE' ? (
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Next action</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="font-medium text-foreground">{nextAction.label}</div>
            <Link href={nextAction.href!} className="text-sm text-[color:var(--accent)] hover:underline">
              Open
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <TenantStat
          label="Open invoices"
          value={String(view.openInvoices)}
          detail={view.nextInvoice ? formatZar(view.nextInvoice.totalCents) : 'All clear'}
          href={view.nextInvoice ? `/tenant/invoices/${view.nextInvoice.id}` : '/tenant/invoices'}
        />
        <TenantStat label="Open tickets" value={String(view.openTickets)} href="/tenant/repairs" />
        <TenantStat label="Pending inspections" value={String(view.pendingInspections)} href="/tenant/inspections" />
        <TenantStat label="Unread notices" value={String(view.unreadNoticeCount)} href="/tenant/notices" />
        <TenantStat
          label="Next outage"
          value={view.nextOutage ? 'Scheduled' : 'None'}
          detail={view.nextOutage ? formatDate(view.nextOutage.startsAt) : undefined}
          href="/tenant/outages"
        />
      </div>

      <Card className="border border-border p-5">
        <h2 className="font-serif text-[28px] font-light text-foreground">Current status</h2>
        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>
            Next invoice:{' '}
            {view.nextInvoice ? `${formatZar(view.nextInvoice.totalCents)} due ${formatDate(view.nextInvoice.dueDate)}` : 'No unpaid invoices'}
          </p>
          <p>
            Next outage:{' '}
            {view.nextOutage
              ? `${formatDate(view.nextOutage.startsAt)} (${view.nextOutage.source}${view.nextOutage.stage ? ` · Stage ${view.nextOutage.stage}` : ''})`
              : 'No upcoming outages'}
          </p>
        </div>
      </Card>
    </div>
  );
}

function TenantStat({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="border border-border p-5 transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]/60">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">{label}</p>
        <p className="mt-3 font-serif text-[28px] font-light text-foreground">{value}</p>
        {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
      </Card>
    </Link>
  );
}
