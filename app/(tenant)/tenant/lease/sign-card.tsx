'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Loader2, MapPin, PenLine, Shield } from 'lucide-react';

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

  return (
    <div className="rounded-lg border-2 border-primary/20 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Review &amp; sign your lease</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Your landlord has drafted this agreement. Read it carefully, then sign to activate the lease.
        By signing, you confirm your identity and agree to the terms below.
      </p>

      {documentUrl && (
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{documentFilename ?? 'Lease agreement'}</p>
              <p className="text-xs text-muted-foreground">Optional PDF copy supplied by your landlord</p>
            </div>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex h-8 items-center rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted"
            >
              Open
            </a>
          </div>
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
          className="h-4 w-4"
        />
        I&apos;ve read the lease agreement above in full.
      </label>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="signed-name" className="text-sm font-medium">Type your full legal name</label>
        <input
          id="signed-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 rounded-md border bg-card px-3 font-mono text-base italic tracking-wide"
          placeholder="Your full name"
        />
      </div>

      <div className="mt-4 rounded-md border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 text-sm">
            {loc ? (
              <>
                <p className="font-medium">Location captured</p>
                <p className="text-xs text-muted-foreground">{loc.text}</p>
              </>
            ) : (
              <>
                <p className="font-medium">Capture signing location (optional)</p>
                <p className="text-xs text-muted-foreground">Records where you signed for the audit trail</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={captureLocation}
            disabled={locPending}
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted disabled:opacity-60"
          >
            {locPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {loc ? 'Update' : 'Share'}
          </button>
        </div>
        {locError && <p className="mt-2 text-xs text-red-600">{locError}</p>}
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          I, <span className="font-medium">{name.trim() || '—'}</span>, agree to the terms of this lease and
          confirm that my typed name acts as my legal signature. I understand that my IP address, user agent,
          and (if shared) location will be recorded for this signature.
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={sign}
        disabled={!canSign || pending}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
        Sign lease
      </button>
    </div>
  );
}

export function SignedConfirmation({ signedName, signedAt, locationText }: { signedName: string; signedAt: Date; locationText?: string | null }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-emerald-900">Lease signed</h2>
      </div>
      <p className="mt-1 text-sm text-emerald-800">
        Signed by <span className="font-medium">{signedName}</span> on{' '}
        {signedAt.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}.
        {locationText ? ` Location: ${locationText}.` : ''}
      </p>
    </div>
  );
}
