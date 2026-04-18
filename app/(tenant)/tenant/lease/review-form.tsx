'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquareWarning } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <MessageSquareWarning className="h-4 w-4" />
        Flag a clause for review
      </Button>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 animate-fade-in-up">
      <CardContent className="p-5">
        <form onSubmit={submit}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <MessageSquareWarning className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Request a clause review</h3>
              <p className="text-xs text-muted-foreground">
                Paste the clause that concerns you and explain what was discussed.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="clause">Clause or excerpt from the lease</Label>
            <Textarea
              id="clause"
              value={clause}
              onChange={(e) => setClause(e.target.value)}
              rows={3}
              minLength={3}
              maxLength={2000}
              required
              placeholder={'e.g. "No pets of any kind are permitted on the premises."'}
            />
          </div>

          <div className="mt-3 space-y-2">
            <Label htmlFor="note">Your note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              minLength={3}
              maxLength={2000}
              required
              placeholder="We agreed verbally that a small dog would be allowed…"
            />
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button
              type="submit"
              disabled={pending || clause.trim().length < 3 || note.trim().length < 3}
              className="gap-2"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit request
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300',
  ACCEPTED: 'bg-emerald-500/10 text-emerald-800 ring-emerald-500/25 dark:text-emerald-300',
  REJECTED: 'bg-destructive/10 text-destructive ring-destructive/25',
  RESOLVED: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
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
      <h3 className="text-sm font-semibold tracking-tight">Your review requests</h3>
      <ul className="space-y-3">
        {items.map((r) => (
          <Card key={r.id} className="text-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
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
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Response from property manager
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{r.pmResponse}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </ul>
    </div>
  );
}
