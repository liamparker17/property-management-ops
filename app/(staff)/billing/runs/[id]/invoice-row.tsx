'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { formatDate, formatZar } from '@/lib/format';

type LineItem = {
  id: string;
  kind: string;
  description: string;
  quantity: string | number | null;
  unitRateCents: number | null;
  amountCents: number;
  estimated: boolean;
};

export function InvoiceRow({
  invoiceId,
  propertyLabel,
  periodStart,
  totalCents,
  status,
  hasEstimates,
  lineItems,
}: {
  invoiceId: string;
  propertyLabel: string;
  periodStart: Date;
  totalCents: number;
  status: string;
  hasEstimates: boolean;
  lineItems: LineItem[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr className="border-b border-border/60 hover:bg-muted/40">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-left font-medium text-foreground hover:text-primary"
            aria-expanded={open}
            aria-controls={`lines-${invoiceId}`}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {propertyLabel}
          </button>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{formatDate(periodStart)}</td>
        <td className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground ring-1 ring-inset ring-border">
            <span className="h-2 w-2 rounded-full bg-current/70" />
            {status}
          </span>
        </td>
        <td className="px-4 py-3">
          {hasEstimates ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-current/70" />
              Estimated
            </span>
          ) : null}
        </td>
        <td className="px-4 py-3 text-right font-serif">{formatZar(totalCents)}</td>
      </tr>
      {open ? (
        <tr id={`lines-${invoiceId}`} className="bg-muted/20">
          <td colSpan={5} className="px-4 py-4">
            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items on this invoice.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 text-left">Kind</th>
                    <th className="py-1 pr-3 text-left">Description</th>
                    <th className="py-1 pr-3 text-right">Qty</th>
                    <th className="py-1 pr-3 text-right">Unit</th>
                    <th className="py-1 pl-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((l) => (
                    <tr key={l.id} className="border-t border-border/40">
                      <td className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {l.kind.replaceAll('_', ' ')}
                        {l.estimated ? ' · est' : ''}
                      </td>
                      <td className="py-2 pr-3">{l.description}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">
                        {l.quantity != null ? String(l.quantity) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">
                        {l.unitRateCents != null ? formatZar(l.unitRateCents) : '—'}
                      </td>
                      <td className="py-2 pl-3 text-right font-medium">{formatZar(l.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
