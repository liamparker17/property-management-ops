import { Receipt, CheckCircle2, CircleDot, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listTenantInvoices } from '@/lib/services/invoices';
import { formatZar, formatDate } from '@/lib/format';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rent statements for your lease.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Next due</p>
          {nextDue ? (
            <>
              <p className="mt-2 text-3xl font-semibold">{formatZar(nextDue.amountCents)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Due {formatDate(nextDue.dueDate)} · {monthLabel(nextDue.periodStart)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Nothing outstanding.</p>
          )}
        </div>
        <div className="rounded-lg border bg-card p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid to date</p>
          <p className="mt-2 text-3xl font-semibold">{formatZar(paidTotalCents)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Across {past.filter((i) => i.status === 'PAID').length} statements.
          </p>
        </div>
      </div>

      <Section title="Upcoming" items={upcoming} emptyLabel="No upcoming invoices" />
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Paid
      </span>
    );
  }
  if (status === 'OVERDUE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
      <CircleDot className="h-3 w-3" />
      Due
    </span>
  );
}

function Section({ title, items, emptyLabel }: { title: string; items: Invoice[]; emptyLabel: string }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-10 text-center">
          <Receipt className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((i) => (
                <tr key={i.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{monthLabel(i.periodStart)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {i.lease.unit.property.name} · {i.lease.unit.label}
                  </td>
                  <td className="px-4 py-3">{formatZar(i.amountCents)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(i.dueDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {i.paidAt ? formatDate(i.paidAt) : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
