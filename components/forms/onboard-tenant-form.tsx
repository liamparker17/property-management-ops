'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Copy, Loader2, UserPlus, Home, Mail } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type UnitOption = { id: string; label: string; propertyName: string };

type Props = { units: UnitOption[] };

type Result = {
  tenantId: string;
  leaseId: string;
  email: string;
  tempPassword: string | null;
  emailSent: boolean;
  emailError?: string;
  smsSent: boolean;
  smsError?: string;
};

const NATIVE_SELECT =
  'flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

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
      sendSmsInvite: form.get('sendSmsInvite') === 'on',
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
      <Card className="max-w-2xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent animate-scale-in">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Tenant onboarded</h2>
              <p className="text-sm text-muted-foreground">
                {result.emailSent
                  ? `Invite email sent to ${result.email}`
                  : 'Draft lease created. Share the login details below.'}
              </p>
            </div>
          </div>
          {result.tempPassword && !result.emailSent && result.emailError && (
            <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              Email not sent: {result.emailError}. You can share the password manually below.
            </div>
          )}
          {result.smsSent && (
            <div className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              SMS invite sent.
            </div>
          )}
          {!result.smsSent && result.smsError && (
            <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              SMS not sent: {result.smsError}.
            </div>
          )}
          <dl className="space-y-2.5">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-3 py-2.5">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Login email</dt>
                <dd className="font-mono text-sm">{result.email}</dd>
              </div>
            </div>
            {result.tempPassword && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-3 py-2.5">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Temporary password</dt>
                  <dd className="font-mono text-sm">{result.tempPassword}</dd>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={copyPassword} className="gap-1.5">
                  <Copy className="h-3 w-3" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Link href={`/leases/${result.leaseId}`} className={cn(buttonVariants(), 'gap-1.5')}>
              Open draft lease
            </Link>
            <Link href={`/tenants/${result.tenantId}`} className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
              View tenant profile
            </Link>
            <Button type="button" variant="ghost" onClick={() => setResult(null)}>
              Onboard another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Tenant details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name<span className="text-destructive">*</span></Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name<span className="text-destructive">*</span></Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="email">Email <span className="text-muted-foreground">(used for portal login)</span><span className="text-destructive">*</span></Label>
              <Input id="email" type="email" name="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID number</Label>
              <Input id="idNumber" name="idNumber" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="tenantNotes">Internal notes</Label>
              <Textarea id="tenantNotes" name="tenantNotes" rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Home className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Lease details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="unitId">Unit<span className="text-destructive">*</span></Label>
              <select id="unitId" name="unitId" required className={NATIVE_SELECT}>
                <option value="">Select a unit…</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.propertyName} · {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date<span className="text-destructive">*</span></Label>
              <Input type="date" id="startDate" name="startDate" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date<span className="text-destructive">*</span></Label>
              <Input type="date" id="endDate" name="endDate" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Monthly rent (ZAR)<span className="text-destructive">*</span></Label>
              <Input type="number" id="rentAmount" name="rentAmount" step="0.01" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depositAmount">Deposit (ZAR)<span className="text-destructive">*</span></Label>
              <Input type="number" id="depositAmount" name="depositAmount" step="0.01" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDueDay">Payment due day<span className="text-destructive">*</span></Label>
              <Input type="number" id="paymentDueDay" name="paymentDueDay" min="1" max="31" defaultValue={1} required />
            </div>
            <label className="flex items-center gap-2.5 self-end rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <input type="checkbox" name="heldInTrustAccount" className="size-4 rounded border-input accent-primary" />
              <span>Deposit held in trust account</span>
            </label>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="leaseNotes">Lease notes <span className="text-muted-foreground">(shown in the agreement as additional terms)</span></Label>
              <Textarea
                id="leaseNotes"
                name="leaseNotes"
                rows={3}
                placeholder="e.g. Parking bay #12 included; geyser serviced annually"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Mail className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">Portal access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <input type="checkbox" name="sendInvite" defaultChecked className="mt-0.5 size-4 rounded border-input accent-primary" />
            <span>
              Create a tenant portal login now. You&rsquo;ll be shown a one-time temporary password to
              share with the tenant so they can sign in, review the lease, and sign.
            </span>
          </label>
          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <input type="checkbox" name="sendSmsInvite" className="mt-0.5 size-4 rounded border-input accent-primary" />
            <span>
              Also send an SMS invite (requires a phone number above, and{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">SMS_GATEWAY_*</code> env vars
              configured).
            </span>
          </label>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <Button type="submit" disabled={pending} size="lg" className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Onboard tenant
        </Button>
      </div>
    </form>
  );
}
