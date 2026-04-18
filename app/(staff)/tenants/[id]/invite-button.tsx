'use client';

import { useState } from 'react';
import { CheckCircle2, Copy, KeyRound, Loader2, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Result = { email: string; tempPassword: string };

export function InvitePortalButton({ tenantId, hasAccount }: { tenantId: string; hasAccount: boolean }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (hasAccount) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Portal access
      </span>
    );
  }

  async function invite() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/invite`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to invite');
      setResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invite');
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={invite} disabled={pending} variant="outline" size="sm">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        {pending ? 'Inviting…' : 'Invite to portal'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="w-80 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Temporary password</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Share this with {result.email}. They&apos;ll be prompted to change it after first login.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-2 py-1.5 font-mono text-sm">
              {result.tempPassword}
            </code>
            <Button onClick={copy} variant="outline" size="sm" className="h-8 px-2 text-xs">
              {copied ? <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            This password is shown once — copy it now.
          </p>
        </div>
      )}
    </div>
  );
}
