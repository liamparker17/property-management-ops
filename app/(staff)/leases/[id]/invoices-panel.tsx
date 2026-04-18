'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatZar, formatDate } from '@/lib/format';

type Invoice = {
  id: string;
  periodStart: string;
  dueDate: string;
  amountCents: number;
  status: 'DUE' | 'PAID' | 'OVERDUE';
  paidAt: string | null;
  paidAmountCents: number | null;
};

function monthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function InvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(inv: Invoice) {
    setBusyId(inv.id);
    const res = await fetch(
      `/api/invoices/${inv.id}/paid`,
      inv.status === 'PAID'
        ? { method: 'DELETE' }
        : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) },
    );
    setBusyId(null);
    if (res.ok) startTransition(() => router.refresh());
    else alert('Failed to update');
  }

  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Due</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices.map((i) => (
            <tr key={i.id} className="transition-colors hover:bg-muted/40">
              <td className="px-4 py-3 font-medium">{monthLabel(i.periodStart)}</td>
              <td className="px-4 py-3">{formatZar(i.amountCents)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(new Date(i.dueDate))}</td>
              <td className="px-4 py-3">
                {i.status === 'PAID' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    Paid {i.paidAt ? formatDate(new Date(i.paidAt)) : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
                    Due
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  onClick={() => toggle(i)}
                  disabled={busyId === i.id || pending}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 text-xs"
                >
                  {busyId === i.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : i.status === 'PAID' ? (
                    <Undo2 className="size-3" />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                  {i.status === 'PAID' ? 'Unpay' : 'Mark paid'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
