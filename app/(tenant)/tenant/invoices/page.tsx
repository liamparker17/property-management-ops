import { Receipt, CheckCircle2, CircleDot, AlertTriangle, CalendarClock, TrendingUp } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listTenantInvoices } from '@/lib/services/invoices';
import { formatZar, formatDate } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';

export const dynamic = 'force-dynamic';

export default async function TenantInvoicesPage() {
  const session = await auth();
  const invoices = await listTenantInvoices(session!.user.id);

  const today = new Date();
  const currentMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const upcoming = invoices.filter((i) => i.periodStart >= currentMonthStart);
  const past = invoices.filter((i) => i.periodStart < currentMonthStart);

  const nextDue = upcoming.find((i) => i.status !== 'PAID');
  const paidTotalCents = past.reduce((sum, i) => sum + (i.paidAmountCents ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Billing" title="Invoices" description="Rent statements for your lease." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent"
          />
          <CardContent className="relative flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next due</p>
              {nextDue ? (
                <>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{formatZar(nextDue.amountCents)}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Due {formatDate(nextDue.dueDate)} · {monthLabel(nextDue.periodStart)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Nothing outstanding.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-transparent to-transparent"
          />
          <CardContent className="relative flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paid to date</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{formatZar(paidTotalCents)}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Across {past.filter((i) => i.status === 'PAID').length} statements.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Section title="Upcoming" items={upcoming} emptyLabel="No upcoming invoices" />
      <Separator />
      <Section title="History" items={past} emptyLabel="No past invoices" />
    </div>
  );
}

type Invoice = Awaited<ReturnType<typeof listTenantInvoices>>[number];

function monthLabel(d: Date) {
  return d.toLocaleString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function StatusPill({ status }: { status: Invoice['status'] }) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Paid
      </span>
    );
  }
  if (status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/25">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300">
      <CircleDot className="h-3 w-3" />
      Due
    </span>
  );
}

function Section({ title, items, emptyLabel }: { title: string; items: Invoice[]; emptyLabel: string }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <span className="h-5 w-1 rounded-full bg-primary" />
        {title}
      </h2>
      {items.length === 0 ? (
        <EmptyState icon={<Receipt className="size-5" />} title={emptyLabel} />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((i) => (
                  <tr key={i.id} className="transition-colors duration-150 even:bg-muted/15 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{monthLabel(i.periodStart)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {i.lease.unit.property.name} · {i.lease.unit.label}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatZar(i.amountCents)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(i.dueDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {i.paidAt ? formatDate(i.paidAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
