'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClipboardList, Loader2, ShieldCheck, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type CreateApplicationResponse = {
  data?:
    | {
        id?: string;
        application?: { id?: string };
      applicationId?: string;
      }
    | null;
  error?: { message?: string } | null;
};

function readMoneyCents(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;

  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;

  return Math.round(amount * 100);
}

export function ApplicationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [signedName, setSignedName] = useState('');

  const consentReady = consentGiven && signedName.trim().length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!consentReady) {
      setError('TPN consent and the applicant signed name are required before you can continue.');
      return;
    }

    setPending(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      applicant: {
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        email: form.get('email'),
        phone: form.get('phone'),
        idNumber: form.get('idNumber') || null,
        employer: form.get('employer') || null,
        grossMonthlyIncomeCents: readMoneyCents(form.get('grossMonthlyIncome')),
        netMonthlyIncomeCents: readMoneyCents(form.get('netMonthlyIncome')),
      },
      application: {
        propertyId: null,
        unitId: null,
        requestedMoveIn: form.get('requestedMoveIn') || null,
        sourceChannel: form.get('sourceChannel') || null,
        notes: form.get('notes') || null,
      },
      consent: {
        consentGiven: true as const,
        signedName: signedName.trim(),
        capturedAt: new Date().toISOString(),
      },
    };

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as CreateApplicationResponse | null;

      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to create application');
        return;
      }

      const applicationId =
        json?.data?.id ?? json?.data?.application?.id ?? json?.data?.applicationId ?? null;

      if (!applicationId) {
        setError('Application created, but the response did not include an id.');
        return;
      }

      router.push(`/applications/${applicationId}`);
      router.refresh();
    } catch {
      setError('Failed to create application');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">Applicant details</CardTitle>
            <CardDescription>
              Capture the prospect record without creating a tenant portal login.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First name<span className="text-destructive">*</span>
              </Label>
              <Input id="firstName" name="firstName" autoComplete="given-name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last name<span className="text-destructive">*</span>
              </Label>
              <Input id="lastName" name="lastName" autoComplete="family-name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email<span className="text-destructive">*</span>
              </Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone<span className="text-destructive">*</span>
              </Label>
              <Input id="phone" name="phone" autoComplete="tel" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">ID / passport</Label>
              <Input id="idNumber" name="idNumber" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer">Employer</Label>
              <Input id="employer" name="employer" autoComplete="organization" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grossMonthlyIncome">Gross monthly income (ZAR)</Label>
              <Input
                id="grossMonthlyIncome"
                name="grossMonthlyIncome"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="netMonthlyIncome">Net monthly income (ZAR)</Label>
              <Input
                id="netMonthlyIncome"
                name="netMonthlyIncome"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">Application details</CardTitle>
            <CardDescription>
              Keep this focused on the prospect and move-in intent. Duplicate checks are intentionally omitted.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requestedMoveIn">Requested move-in date</Label>
              <Input id="requestedMoveIn" name="requestedMoveIn" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceChannel">Source channel</Label>
              <Input
                id="sourceChannel"
                name="sourceChannel"
                placeholder="Referral, walk-in, website, portal..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Internal notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Capture context for the reviewer, property intent, or affordability notes."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardHeader className="flex-row items-center gap-2.5 space-y-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">TPN consent</CardTitle>
            <CardDescription>
              Capture screening consent now so the application is ready for the later TPN request flow.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 rounded-lg border border-border bg-background/80 px-4 py-3 text-sm">
            <Checkbox
              checked={consentGiven}
              onCheckedChange={(checked) => {
                setConsentGiven(Boolean(checked));
                if (error) setError(null);
              }}
              aria-label="Applicant consents to TPN screening"
              className="mt-0.5"
            />
            <span className="leading-6">
              Applicant consents to TPN screening.
            </span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="signedName">
              Typed name for consent confirmation<span className="text-destructive">*</span>
            </Label>
            <Input
              id="signedName"
              name="signedName"
              value={signedName}
              onChange={(e) => {
                setSignedName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Type the applicant's full name exactly as confirmed"
              required={consentGiven}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            This captures staff-held consent for TPN screening only. Applicants are not issued portal access at this stage.
          </p>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !consentReady} size="lg" className="gap-2">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {pending ? 'Creating application...' : 'Create application'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Submission stays disabled until the TPN consent block is complete.
        </p>
      </div>
    </form>
  );
}
