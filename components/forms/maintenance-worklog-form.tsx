'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function MaintenanceWorklogForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${requestId}/worklogs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to post');
        return;
      }
      setBody('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Add a comment…"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={busy || body.trim().length === 0}>
          {busy ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </form>
  );
}

export function ScheduleButton({ requestId, initial }: { requestId: string; initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) {
      setError('Pick a date');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${requestId}/schedule`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scheduledFor: new Date(value).toISOString() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to schedule');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? 'Saving…' : 'Schedule'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}

export function CompleteForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${requestId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(summary.trim() ? { summary: summary.trim() } : {}),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to complete');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={3}
        placeholder="Summary of work completed (optional)"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? 'Saving…' : 'Mark complete'}
      </Button>
    </form>
  );
}
