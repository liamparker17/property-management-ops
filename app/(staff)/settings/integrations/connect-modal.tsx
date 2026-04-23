'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Status = 'DISCONNECTED' | 'CONNECTED' | 'ERROR';
type Provider =
  | 'STITCH_PAYMENTS'
  | 'STITCH_DEBICHECK'
  | 'STITCH_PAYOUTS'
  | 'QUICKBOOKS'
  | 'TPN';

interface IntegrationRowProps {
  provider: string;
  label: string;
  description: string;
  status: Status;
  externalAccountId: string | null;
  lastError: string | null;
}

function statusVariant(status: Status): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'CONNECTED') return 'default';
  if (status === 'ERROR') return 'destructive';
  return 'outline';
}

export function IntegrationRow({
  provider,
  label,
  description,
  status,
  externalAccountId,
  lastError,
}: IntegrationRowProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm(`Disconnect ${label}? Stored credentials will be cleared.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/settings/integrations/${provider}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.error?.message ?? 'Failed to disconnect');
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          <Badge variant={statusVariant(status)} className="uppercase tracking-wider">
            {status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        {externalAccountId ? (
          <p className="font-mono text-xs text-muted-foreground">
            Account: {externalAccountId}
          </p>
        ) : null}
        {lastError && status === 'ERROR' ? (
          <p className="text-xs text-destructive">{lastError}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        {status === 'CONNECTED' ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          <ConnectButton provider={provider as Provider} label={label} />
        )}
      </div>
    </div>
  );
}

interface ConnectButtonProps {
  provider: Provider;
  label: string;
}

function ConnectButton({ provider, label }: ConnectButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Connect</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {label}</DialogTitle>
          <DialogDescription>
            {connectDescription(provider)}
          </DialogDescription>
        </DialogHeader>
        <ConnectBody provider={provider} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function connectDescription(provider: Provider): string {
  switch (provider) {
    case 'STITCH_PAYMENTS':
    case 'STITCH_DEBICHECK':
    case 'STITCH_PAYOUTS':
      return 'Opens the Stitch white-label partner onboarding flow. Your workspace is liable for Stitch fees and KYC.';
    case 'QUICKBOOKS':
      return 'Connect an existing QuickBooks Online realm via OAuth, or sign up for a new QBO account through our partner referral.';
    case 'TPN':
      return 'Enter your TPN account identifier and API key. Tokens are encrypted at rest with AES-256-GCM.';
  }
}

function ConnectBody({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  if (provider === 'TPN') {
    return <TpnConnectForm onClose={onClose} />;
  }
  if (provider === 'QUICKBOOKS') {
    return <QuickbooksConnectBody onClose={onClose} />;
  }
  return <StitchConnectBody provider={provider} onClose={onClose} />;
}

function TpnConnectForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [externalAccountId, setExternalAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Phase A only scaffolds the UI. The TPN connect API endpoint that persists
      // these credentials lands with the broader integrations callbacks (Phase D/E).
      const res = await fetch('/api/integrations/tpn/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'TPN',
          externalAccountId: externalAccountId.trim() || null,
          accessToken: accessToken.trim(),
        }),
      });
      if (res.status === 404) {
        setError('TPN connect endpoint not yet available. Coming in a follow-up phase.');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message ?? 'Failed to connect');
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tpn-account">Account identifier</Label>
        <Input
          id="tpn-account"
          value={externalAccountId}
          onChange={(e) => setExternalAccountId(e.target.value)}
          placeholder="TPN customer code"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tpn-key">API key</Label>
        <Input
          id="tpn-key"
          type="password"
          required
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Bearer token"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || !accessToken.trim()}>
          {busy ? 'Connecting…' : 'Connect TPN'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function QuickbooksConnectBody({ onClose }: { onClose: () => void }) {
  const affiliateId = process.env.NEXT_PUBLIC_QBO_AFFILIATE_ID ?? '';
  const signupHref = `https://quickbooks.intuit.com/?cid=partner_${affiliateId}`;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <a
          href="/api/integrations/quickbooks/start"
          className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Connect QuickBooks Online
        </a>
        <p className="text-xs text-muted-foreground">
          Opens Intuit OAuth in a new tab. The OAuth callback (Phase E) will persist your realm.
        </p>
      </div>
      <div className="space-y-2 border-t border-border/60 pt-4">
        <p className="text-sm">Don&apos;t have QuickBooks yet?</p>
        <a
          href={signupHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Sign up for QuickBooks
        </a>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}

function StitchConnectBody({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  const partnerId = process.env.NEXT_PUBLIC_STITCH_PARTNER_ID ?? '';
  const redirectUri = process.env.NEXT_PUBLIC_STITCH_REDIRECT_URI ?? '';
  const stitchProduct =
    provider === 'STITCH_PAYMENTS'
      ? 'payments'
      : provider === 'STITCH_DEBICHECK'
        ? 'debicheck'
        : 'payouts';
  const url = `https://secure.stitch.money/connect?partner_id=${encodeURIComponent(partnerId)}&redirect_uri=${encodeURIComponent(redirectUri)}&product=${stitchProduct}`;

  return (
    <div className="space-y-4">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Open Stitch onboarding
      </a>
      <p className="text-xs text-muted-foreground">
        On completion, Stitch redirects back to this workspace and the callback (Phase D) persists
        your encrypted tokens.
      </p>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}
