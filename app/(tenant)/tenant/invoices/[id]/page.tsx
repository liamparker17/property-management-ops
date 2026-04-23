import Link from 'next/link';
import { ArrowLeft, CreditCard, Receipt } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate, formatZar } from '@/lib/format';
import { getInvoiceForTenant } from '@/lib/services/invoices';
import { DebiCheckCard } from '../../payments/debicheck-card';
import { SelfManagedDebitOrderCard } from '../../payments/self-managed-card';
import { PayButton } from './pay-button';

export const dynamic = 'force-dynamic';

type InvoiceLineItemKind =
  | 'RENT'
  | 'UTILITY_WATER'
  | 'UTILITY_ELECTRICITY'
  | 'UTILITY_GAS'
  | 'UTILITY_SEWER'
  | 'UTILITY_REFUSE'
  | 'ADJUSTMENT'
  | 'LATE_FEE'
  | 'DEPOSIT_CHARGE';

const KIND_GROUPS: { label: string; kinds: InvoiceLineItemKind[] }[] = [
  { label: 'Rent', kinds: ['RENT'] },
  {
    label: 'Utilities',
    kinds: ['UTILITY_WATER', 'UTILITY_ELECTRICITY', 'UTILITY_GAS', 'UTILITY_SEWER', 'UTILITY_REFUSE'],
  },
  { label: 'Adjustments & fees', kinds: ['ADJUSTMENT', 'LATE_FEE', 'DEPOSIT_CHARGE'] },
];

function monthLabel(date: Date) {
  return date.toLocaleString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function StatusPill({ status }: { status: 'DRAFT' | 'DUE' | 'PAID' | 'OVERDUE' }) {
  const styles: Record<typeof status, string> = {
    PAID: 'bg-emerald-500/10 text-emerald-800 ring-emerald-600/20 dark:text-emerald-300',
    OVERDUE: 'bg-destructive/10 text-destructive ring-destructive/25',
    DUE: 'bg-[color:var(--accent)]/10 text-foreground ring-[color:var(--accent)]/30',
    DRAFT: 'bg-muted text-muted-foreground ring-border',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset ${styles[status]}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

export default async function TenantInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const invoice = await getInvoiceForTenant(session!.user.id, id);

  const lineItems = invoice.lineItems;
  const hasLineItems = lineItems.length > 0;
  const subtotalCents = invoice.subtotalCents || invoice.amountCents;
  const totalCents = invoice.totalCents || invoice.amountCents;
  const taxCents = invoice.taxCents;

  const mandate = await db.debiCheckMandate.findUnique({
    where: { leaseId: invoice.leaseId },
    select: { status: true, upperCapCents: true },
  });

  const showPayNow = invoice.status === 'DUE' || invoice.status === 'OVERDUE';
  const mandateStatus = mandate?.status ?? 'NONE';
  const showDebiCheck = mandateStatus !== 'ACTIVE';
  const showSelfManaged = !invoice.lease.selfManagedDebitOrderActive;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/tenant/invoices"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to invoices
        </Link>
      </div>

      <PageHeader
        eyebrow={`Invoice / ${monthLabel(invoice.periodStart)}`}
        title={formatZar(totalCents)}
        description={
          <>
            {invoice.lease.unit.property.name} / {invoice.lease.unit.label} — due{' '}
            {formatDate(invoice.dueDate)}
          </>
        }
        actions={<StatusPill status={invoice.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <Card className="overflow-hidden border border-border p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {!hasLineItems ? (
                    <tr>
                      <td className="px-4 py-4 font-medium">
                        Monthly rent — {monthLabel(invoice.periodStart)}
                      </td>
                      <td className="px-4 py-4 text-right text-muted-foreground">—</td>
                      <td className="px-4 py-4 text-right text-muted-foreground">—</td>
                      <td className="px-4 py-4 text-right font-medium">
                        {formatZar(invoice.amountCents)}
                      </td>
                    </tr>
                  ) : (
                    KIND_GROUPS.flatMap((group) => {
                      const rows = lineItems.filter((li) =>
                        group.kinds.includes(li.kind as InvoiceLineItemKind),
                      );
                      if (rows.length === 0) return [];
                      const groupTotal = rows.reduce((sum, li) => sum + li.amountCents, 0);
                      return [
                        <tr key={`${group.label}-header`} className="bg-muted/20">
                          <td
                            colSpan={4}
                            className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                          >
                            {group.label}
                          </td>
                        </tr>,
                        ...rows.map((li) => (
                          <tr key={li.id}>
                            <td className="px-4 py-3">
                              <div className="font-medium">{li.description}</div>
                              {li.estimated ? (
                                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                  Estimated
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {li.quantity !== null && li.quantity !== undefined
                                ? String(li.quantity)
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {li.unitRateCents !== null && li.unitRateCents !== undefined
                                ? formatZar(li.unitRateCents)
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatZar(li.amountCents)}
                            </td>
                          </tr>
                        )),
                        <tr key={`${group.label}-subtotal`} className="bg-muted/10">
                          <td
                            colSpan={3}
                            className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                          >
                            {group.label} subtotal
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatZar(groupTotal)}
                          </td>
                        </tr>,
                      ];
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Subtotal
                    </td>
                    <td className="px-4 py-2 text-right">{formatZar(subtotalCents)}</td>
                  </tr>
                  {taxCents > 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        Tax
                      </td>
                      <td className="px-4 py-2 text-right">{formatZar(taxCents)}</td>
                    </tr>
                  ) : null}
                  <tr className="border-t border-border/60 bg-muted/40">
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-foreground"
                    >
                      Total due
                    </td>
                    <td className="px-4 py-3 text-right font-serif text-[22px] font-light">
                      {formatZar(totalCents)}
                    </td>
                  </tr>
                  {invoice.paidAt ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        Paid {formatDate(invoice.paidAt)}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">
                        {formatZar(invoice.paidAmountCents ?? totalCents)}
                      </td>
                    </tr>
                  ) : null}
                </tfoot>
              </table>
            </div>
          </Card>

          {invoice.paidNote ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4" />
                  Payment note
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.paidNote}</p>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <aside className="space-y-4">
          {showPayNow ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Pay now
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Settle this invoice with an instant EFT.
                </p>
                <PayButton invoiceId={invoice.id} amountCents={totalCents} />
              </CardContent>
            </Card>
          ) : null}

          {showDebiCheck ? (
            <DebiCheckCard
              leaseId={invoice.leaseId}
              upperCapCents={mandate?.upperCapCents ?? Math.round(totalCents * 1.1)}
              initialStatus={mandateStatus}
            />
          ) : null}

          {showSelfManaged ? (
            <SelfManagedDebitOrderCard
              leaseId={invoice.leaseId}
              initialActive={invoice.lease.selfManagedDebitOrderActive}
            />
          ) : null}

          {!showPayNow && !showDebiCheck && !showSelfManaged ? (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-muted-foreground">
                  All payment rails are set up for this lease.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      <Separator />

      <div className="text-xs text-muted-foreground">
        Invoice reference: <span className="font-mono">{invoice.id}</span>
      </div>
    </div>
  );
}
