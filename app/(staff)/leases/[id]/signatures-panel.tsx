'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, Check, X, CheckCheck } from 'lucide-react';

type Signature = {
  id: string;
  signedName: string;
  signedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
  tenantId: string;
};

type ReviewStatus = 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'RESOLVED';

type ReviewRequest = {
  id: string;
  status: ReviewStatus;
  clauseExcerpt: string;
  tenantNote: string;
  pmResponse: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  tenant: { id: string; firstName: string; lastName: string } | null;
};

type Props = {
  signatures: Signature[];
  reviewRequests: ReviewRequest[];
  tenantNameMap: Record<string, string>;
};

function fmt(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusClasses(status: ReviewStatus) {
  switch (status) {
    case 'OPEN':
      return 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400';
    case 'ACCEPTED':
      return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400';
    case 'REJECTED':
      return 'bg-destructive/10 text-destructive ring-destructive/20';
    case 'RESOLVED':
      return 'bg-muted text-muted-foreground ring-border';
  }
}

export function SignaturesPanel({ signatures, reviewRequests, tenantNameMap }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});

  async function respond(id: string, status: 'ACCEPTED' | 'REJECTED' | 'RESOLVED') {
    setBusyId(id);
    const pmResponse = responses[id]?.trim() || null;
    const res = await fetch(`/api/review-requests/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status, pmResponse }),
    });
    setBusyId(null);
    if (res.ok) {
      setResponses((r) => ({ ...r, [id]: '' }));
      startTransition(() => router.refresh());
    } else {
      alert('Failed to update');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-medium">Signatures & review requests</h2>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Signatures</h3>
        {signatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">No signatures yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y">
              {signatures.map((s) => (
                <li key={s.id} className="space-y-1 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{tenantNameMap[s.tenantId] ?? 'Unknown tenant'}</span>
                    <span className="text-xs text-muted-foreground">{fmt(s.signedAt)}</span>
                  </div>
                  <div className="font-mono italic text-muted-foreground">{s.signedName}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {s.ipAddress && <span>IP: {s.ipAddress}</span>}
                    {s.locationText && <span>Location: {s.locationText}</span>}
                    {s.userAgent && (
                      <span className="max-w-full truncate" title={s.userAgent}>
                        UA: {s.userAgent.length > 80 ? `${s.userAgent.slice(0, 80)}…` : s.userAgent}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Review requests</h3>
        {reviewRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No review requests.</p>
        ) : (
          <ul className="space-y-3">
            {reviewRequests.map((r) => {
              const tenantName = r.tenant ? `${r.tenant.firstName} ${r.tenant.lastName}` : 'Unknown tenant';
              const isBusy = busyId === r.id || pending;
              return (
                <li key={r.id} className="space-y-3 rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tenantName}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClasses(r.status)}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmt(r.createdAt)}</span>
                  </div>

                  <blockquote className="rounded-md border-l-2 border-muted-foreground/30 bg-muted/40 px-3 py-2 text-sm italic text-muted-foreground">
                    {r.clauseExcerpt}
                  </blockquote>

                  <p className="whitespace-pre-wrap text-sm">{r.tenantNote}</p>

                  {r.pmResponse && (
                    <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Property manager response
                        {r.respondedAt && <span className="ml-2 font-normal normal-case">{fmt(r.respondedAt)}</span>}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{r.pmResponse}</div>
                    </div>
                  )}

                  {r.status === 'OPEN' && (
                    <div className="space-y-2">
                      <textarea
                        value={responses[r.id] ?? ''}
                        onChange={(e) => setResponses((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Write a response (optional)…"
                        rows={3}
                        disabled={isBusy}
                        className="block w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => respond(r.id, 'ACCEPTED')}
                          disabled={isBusy}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                        >
                          {busyId === r.id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(r.id, 'REJECTED')}
                          disabled={isBusy}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 disabled:opacity-60"
                        >
                          {busyId === r.id ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(r.id, 'RESOLVED')}
                          disabled={isBusy}
                          className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
                        >
                          {busyId === r.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />}
                          Mark resolved
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
