'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Loader2, MapPin, PenLine, Shield, Sparkles } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
  leaseId: string;
  documentUrl?: string | null;
  documentFilename?: string | null;
  tenantFullName: string;
};

type LocationInfo = { latitude: number; longitude: number; text: string };

export function SignLeaseCard({ leaseId, documentUrl, documentFilename, tenantFullName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(tenantFullName);
  const [agreed, setAgreed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [loc, setLoc] = useState<LocationInfo | null>(null);
  const [locPending, setLocPending] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function captureLocation() {
    setLocError(null);
    setLocPending(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false });
      });
      const { latitude, longitude } = pos.coords;
      const text = `lat ${latitude.toFixed(4)}, lon ${longitude.toFixed(4)}`;
      setLoc({ latitude, longitude, text });
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Failed to get location');
    } finally {
      setLocPending(false);
    }
  }

  async function sign() {
    setError(null);
    setPending(true);
    const res = await fetch(`/api/leases/${leaseId}/sign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        signedName: name,
        agreed: true,
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        locationText: loc?.text ?? null,
      }),
    });
    setPending(false);
    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error?.message ?? 'Failed to sign');
    }
  }

  const canSign = agreed && reviewed && name.trim().length >= 3;
  const step = !reviewed ? 1 : !name.trim().length ? 2 : 3;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card shadow-elevated">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(135deg,oklch(var(--primary)/.4),oklch(var(--primary)/.05),oklch(var(--primary)/.4))_border-box]"
      />
      <div className="relative p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Action required
                </span>
              </div>
              <h2 className="mt-0.5 text-xl font-semibold tracking-tight">Review &amp; sign your lease</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Read carefully, then sign to activate.
              </p>
            </div>
          </div>
        </div>

        <ol className="mt-5 flex items-center gap-2 text-xs">
          <ProgressStep n={1} label="Read" active={step >= 1} done={reviewed} />
          <span className="h-px flex-1 bg-border" />
          <ProgressStep n={2} label="Confirm" active={step >= 2} done={agreed} />
          <span className="h-px flex-1 bg-border" />
          <ProgressStep n={3} label="Sign" active={step >= 3} done={false} />
        </ol>

        {documentUrl && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{documentFilename ?? 'Lease agreement'}</p>
              <p className="text-xs text-muted-foreground">Optional PDF copy supplied by your landlord</p>
            </div>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              Open
            </a>
          </div>
        )}

        <label className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm cursor-pointer transition-colors hover:bg-muted/50">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          I&apos;ve read the lease agreement above in full.
        </label>

        <div className="mt-4 space-y-2">
          <Label htmlFor="signed-name">Type your full legal name</Label>
          <Input
            id="signed-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 font-mono text-base italic tracking-wide"
            placeholder="Your full name"
          />
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 text-sm">
            {loc ? (
              <>
                <p className="font-medium">Location captured</p>
                <p className="truncate text-xs text-muted-foreground">{loc.text}</p>
              </>
            ) : (
              <>
                <p className="font-medium">Capture signing location (optional)</p>
                <p className="text-xs text-muted-foreground">Records where you signed for the audit trail</p>
              </>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={captureLocation}
            disabled={locPending}
            className="gap-1.5"
          >
            {locPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {loc ? 'Update' : 'Share'}
          </Button>
        </div>
        {locError && <p className="mt-2 text-xs text-destructive">{locError}</p>}

        <label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm cursor-pointer transition-colors hover:bg-muted/50">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 rounded border-input accent-primary"
          />
          <span>
            I, <span className="font-medium">{name.trim() || '—'}</span>, agree to the terms of this lease and
            confirm that my typed name acts as my legal signature. I understand that my IP address, user agent,
            and (if shared) location will be recorded for this signature.
          </span>
        </label>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={sign}
          disabled={!canSign || pending}
          size="lg"
          className="mt-5 h-11 w-full gap-2 shadow-md shadow-primary/20 transition-shadow hover:shadow-primary/30"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
          {pending ? 'Signing…' : 'Sign lease'}
        </Button>
      </div>
    </div>
  );
}

function ProgressStep({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors',
          done
            ? 'bg-primary text-primary-foreground'
            : active
              ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
              : 'bg-muted text-muted-foreground',
        )}
      >
        {done ? <CheckCircle2 className="h-3 w-3" /> : n}
      </span>
      <span className={cn('text-[11px] font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
    </li>
  );
}

export function SignedConfirmation({
  signedName,
  signedAt,
  locationText,
}: {
  signedName: string;
  signedAt: Date;
  locationText?: string | null;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-6 shadow-elevated animate-scale-in">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl"
      />
      <div className="relative flex items-start gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md">
          <CheckCircle2 className="h-6 w-6" />
          <Sparkles
            aria-hidden
            className="absolute -top-1 -right-1 h-4 w-4 text-amber-300 animate-pulse"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
            Lease signed
          </h2>
          <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
            Signed by <span className="font-semibold">{signedName}</span> on{' '}
            {signedAt.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}.
            {locationText ? ` Location: ${locationText}.` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
