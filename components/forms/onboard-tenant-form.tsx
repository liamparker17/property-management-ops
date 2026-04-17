'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';

type UnitOption = { id: string; label: string; propertyName: string };

type Props = { units: UnitOption[] };

type Result = {
  tenantId: string;
  leaseId: string;
  email: string;
  tempPassword: string | null;
};

export function OnboardTenantForm({ units }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      email: form.get('email'),
      phone: form.get('phone') || null,
      idNumber: form.get('idNumber') || null,
      tenantNotes: form.get('tenantNotes') || null,
      unitId: form.get('unitId'),
      startDate: form.get('startDate'),
      endDate: form.get('endDate'),
      rentAmountCents: Math.round(Number(form.get('rentAmount')) * 100),
      depositAmountCents: Math.round(Number(form.get('depositAmount')) * 100),
      heldInTrustAccount: form.get('heldInTrustAccount') === 'on',
      paymentDueDay: Number(form.get('paymentDueDay')),
      leaseNotes: form.get('leaseNotes') || null,
      sendInvite: form.get('sendInvite') === 'on',
    };
    const res = await fetch('/api/onboarding/tenants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Failed to onboard tenant');
      return;
    }
    setResult(json.data);
    router.refresh();
  }

  async function copyPassword() {
    if (!result?.tempPassword) return;
    await navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="max-w-2xl rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-center gap-2 text-emerald-900">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Tenant onboarded</h2>
        </div>
        <p className="mt-1 text-sm text-emerald-900">
          Draft lease created. Share the login details below so the tenant can review &amp; sign.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4 rounded-md border border-emerald-200 bg-white px-3 py-2">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Login email</dt>
              <dd className="font-mono text-sm">{result.email}</dd>
            </div>
          </div>
          {result.tempPassword && (
            <div className="flex items-center justify-between gap-4 rounded-md border border-emerald-200 bg-white px-3 py-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Temporary password</dt>
                <dd className="font-mono text-sm">{result.tempPassword}</dd>
              </div>
              <button
                type="button"
                onClick={copyPassword}
                className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2 text-xs font-medium hover:bg-muted"
              >
                <Copy className="h-3 w-3" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </dl>
        <div className="mt-5 flex items-center gap-2">
          <a
            href={`/leases/${result.leaseId}`}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Open draft lease
          </a>
          <a
            href={`/tenants/${result.tenantId}`}
            className="inline-flex h-9 items-center rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
          >
            View tenant profile
          </a>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="inline-flex h-9 items-center rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"
          >
            Onboard another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Tenant details</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <label className="flex flex-col gap-1">
            First name
            <input name="firstName" required className="h-9 rounded-md border bg-card px-3" />
          </label>
          <label className="flex flex-col gap-1">
            Last name
            <input name="lastName" required className="h-9 rounded-md border bg-card px-3" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Email (used for portal login)
            <input
              type="email"
              name="email"
              required
              className="h-9 rounded-md border bg-card px-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            Phone
            <input name="phone" className="h-9 rounded-md border bg-card px-3" />
          </label>
          <label className="flex flex-col gap-1">
            ID number
            <input name="idNumber" className="h-9 rounded-md border bg-card px-3" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Internal notes
            <textarea
              name="tenantNotes"
              rows={2}
              className="rounded-md border bg-card px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Lease details</h3>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <label className="col-span-2 flex flex-col gap-1">
            Unit
            <select name="unitId" required className="h-9 rounded-md border bg-card px-3">
              <option value="">Select a unit…</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.propertyName} · {u.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Start date
            <input
              type="date"
              name="startDate"
              required
              className="h-9 rounded-md border bg-card px-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            End date
            <input
              type="date"
              name="endDate"
              required
              className="h-9 rounded-md border bg-card px-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            Monthly rent (ZAR)
            <input
              type="number"
              name="rentAmount"
              step="0.01"
              min="0"
              required
              className="h-9 rounded-md border bg-card px-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            Deposit (ZAR)
            <input
              type="number"
              name="depositAmount"
              step="0.01"
              min="0"
              required
              className="h-9 rounded-md border bg-card px-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            Payment due day
            <input
              type="number"
              name="paymentDueDay"
              min="1"
              max="31"
              defaultValue={1}
              required
              className="h-9 rounded-md border bg-card px-3"
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" name="heldInTrustAccount" className="h-4 w-4" />
            Deposit held in trust account
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Lease notes (shown in the agreement as additional terms)
            <textarea
              name="leaseNotes"
              rows={3}
              className="rounded-md border bg-card px-3 py-2"
              placeholder="e.g. Parking bay #12 included; geyser serviced annually"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Portal access</h3>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" name="sendInvite" defaultChecked className="mt-0.5 h-4 w-4" />
          <span>
            Create a tenant portal login now. You&rsquo;ll be shown a one-time temporary password to
            share with the tenant so they can sign in, review the lease, and sign.
          </span>
        </label>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Onboard tenant
        </button>
      </div>
    </form>
  );
}
