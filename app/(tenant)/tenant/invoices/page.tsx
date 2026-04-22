import { AlertTriangle, CalendarClock, CheckCircle2, CircleDot, Receipt, TrendingUp } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/auth';
import { formatDate, formatZar } from '@/lib/format';
import { listTenantInvoices } from '@/lib/services/invoices';

export const dynamic = 'force-dynamic';

export default async function TenantInvoicesPage() {
  const session = await auth();
  const invoices = await listTenantInvoices(session!.user.id);

  const today = new Date();
  const currentMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const upcoming = invoices.filter((invoice) => invoice.periodStart >= currentMonthStart);
  const past = invoices.filter((invoice) => invoice.periodStart < currentMonthStart);

  const nextDue = upcoming.find((invoice) => invoice.status !== 'PAID');
  const paidTotalCents = past.reduce((sum, invoice) => sum + (invoice.paidAmountCents ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Billing" title="Invoices" description="Rent statements for your lease." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden border border-border">
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary opacity-70" />
          <CardContent className="relative flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center border border-primary/20 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Next due</p>
              {nextDue ? (
                <>
                  <p className="mt-2 font-serif text-[30px] font-light leading-none tracking-[-0.02em]">
                    {formatZar(nextDue.amountCents)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Due {formatDate(nextDue.dueDate)} / {monthLabel(nextDue.periodStart)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Nothing outstanding.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border">
          <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[color:var(--accent)] opacity-70" />
          <CardContent className="relative flex items-start gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center border border-[color:var(--accent)]/25 text-[color:var(--accent)]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Paid to date</p>
              <p className="mt-2 font-serif text-[30px] font-light leading-none tracking-[-0.02em]">
                {formatZar(paidTotalCents)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Across {past.filter((invoice) => invoice.status === 'PAID').length} statements.
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

function monthLabel(date: Date) {
  return date.toLocaleString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function StatusPill({ status }: { status: Invoice['status'] }) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Paid
      </span>
    );
  }

  if (status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-destructive ring-1 ring-inset ring-destructive/25">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--accent)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground ring-1 ring-inset ring-[color:var(--accent)]/30">
      <CircleDot className="h-3 w-3" />
      Due
    </span>
  );
}

function Section({ title, items, emptyLabel }: { title: string; items: Invoice[]; emptyLabel: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-serif text-[28px] font-light tracking-[-0.01em] text-foreground">{title}</h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {title === 'Upcoming' ? 'Statements still to be settled.' : 'Previously issued rent statements.'}
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Receipt className="size-5" />} title={emptyLabel} />
      ) : (
        <Card className="overflow-hidden border border-border p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="transition-colors duration-150 even:bg-muted/15 hover:bg-[color:var(--muted)]/45"
                  >
                    <td className="px-4 py-3 font-medium">{monthLabel(invoice.periodStart)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {invoice.lease.unit.property.name} / {invoice.lease.unit.label}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatZar(invoice.amountCents)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(invoice.dueDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={invoice.status} />
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
