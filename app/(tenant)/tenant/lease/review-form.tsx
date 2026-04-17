'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquareWarning } from 'lucide-react';

type Props = { leaseId: string };

export function ReviewRequestForm({ leaseId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clause, setClause] = useState('');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch(`/api/leases/${leaseId}/review-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clauseExcerpt: clause, tenantNote: note }),
    });
    setPending(false);
    if (res.ok) {
      setClause('');
      setNote('');
      setOpen(false);
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error?.message ?? 'Failed to submit review request');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        <MessageSquareWarning className="h-4 w-4" />
        Flag a clause for review
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageSquareWarning className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold">Request a clause review</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Paste the exact clause or section that concerns you, then explain what was discussed
        differently. Your property manager will review and respond.
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="clause" className="text-xs font-medium">
          Clause or excerpt from the lease
        </label>
        <textarea
          id="clause"
          value={clause}
          onChange={(e) => setClause(e.target.value)}
          rows={3}
          minLength={3}
          maxLength={2000}
          required
          className="rounded-md border bg-card px-3 py-2 text-sm"
          placeholder={'e.g. "No pets of any kind are permitted on the premises."'}
        />
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <label htmlFor="note" className="text-xs font-medium">
          Your note
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          minLength={3}
          maxLength={2000}
          required
          className="rounded-md border bg-card px-3 py-2 text-sm"
          placeholder="We agreed verbally that a small dog would be allowed…"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || clause.trim().length < 3 || note.trim().length < 3}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Submit request
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-9 items-center rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-50 text-amber-800 ring-amber-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
  RESOLVED: 'bg-slate-100 text-slate-700 ring-slate-200',
};

type ReviewRow = {
  id: string;
  status: string;
  clauseExcerpt: string;
  tenantNote: string;
  pmResponse: string | null;
  createdAt: Date;
  respondedAt: Date | null;
};

export function ReviewRequestList({ items }: { items: ReviewRow[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Your review requests</h3>
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-lg border bg-card p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  STATUS_STYLES[r.status] ?? STATUS_STYLES.OPEN
                }`}
              >
                {r.status}
              </span>
            </div>
            <blockquote className="mt-2 border-l-2 border-muted pl-3 text-xs italic text-muted-foreground">
              {r.clauseExcerpt}
            </blockquote>
            <p className="mt-2 whitespace-pre-wrap">{r.tenantNote}</p>
            {r.pmResponse && (
              <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                <div className="text-xs font-medium text-muted-foreground">Response from property manager</div>
                <p className="mt-1 whitespace-pre-wrap">{r.pmResponse}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
