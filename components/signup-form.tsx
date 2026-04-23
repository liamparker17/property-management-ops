'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SIGNUP_PORTFOLIO_SIZES, SIGNUP_ROLES } from '@/lib/zod/signup';

const ROLE_LABELS: Record<(typeof SIGNUP_ROLES)[number], string> = {
  PROPERTY_MANAGER: 'Property Manager',
  LANDLORD: 'Landlord',
  MANAGING_AGENT: 'Managing Agent',
  OTHER: 'Other',
};

const SIZE_LABELS: Record<(typeof SIGNUP_PORTFOLIO_SIZES)[number], string> = {
  '1-10': '1–10 units',
  '11-50': '11–50 units',
  '51-250': '51–250 units',
  '250+': '250+ units',
};

type FieldErrors = Partial<Record<string, string>>;

export function SignupForm() {
  const [role, setRole] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const data = new FormData(e.currentTarget);
    const payload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      company: String(data.get('company') ?? ''),
      role,
      portfolioSize: size,
      message,
      agree,
    };

    try {
      const res = await fetch('/api/public/signup-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSuccess(true);
        setPending(false);
        return;
      }
      if (res.status === 400) {
        const body = (await res.json().catch(() => ({}))) as {
          fieldErrors?: FieldErrors;
          error?: string;
        };
        setErrors(body.fieldErrors ?? {});
        setFormError(body.error ?? 'Please fix the highlighted fields.');
      } else if (res.status === 429) {
        setFormError('Too many requests. Please try again in a few minutes.');
      } else {
        setFormError('Something went wrong on our side. Please try again.');
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    }
    setPending(false);
  }

  if (success) {
    return (
      <div
        className="flex flex-col gap-3 border p-6"
        style={{ borderColor: '#00206033', background: 'rgba(0,32,96,0.04)' }}
      >
        <div
          className="font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: '#b8965a' }}
        >
          Request received
        </div>
        <h2 className="font-serif text-[24px] leading-tight" style={{ color: '#001030' }}>
          We&apos;ll reach out within one business day.
        </h2>
        <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.65)' }}>
          Thanks for your interest in Regalis. A member of our team will be in touch to set up your
          workspace and walk you through onboarding.
        </p>
        <div className="mt-4 text-[13px]">
          <Link href="/" className="underline" style={{ color: '#002060' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-[13px] font-medium text-foreground/80">
          Full name
        </Label>
        <Input id="name" name="name" type="text" required autoComplete="name" className="h-10 text-[15px]" />
        {errors.name && <p className="text-[12px] text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[13px] font-medium text-foreground/80">
          Work email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.co.za"
          className="h-10 text-[15px]"
        />
        {errors.email && <p className="text-[12px] text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company" className="text-[13px] font-medium text-foreground/80">
          Company / organisation
        </Label>
        <Input id="company" name="company" type="text" required className="h-10 text-[15px]" />
        {errors.company && <p className="text-[12px] text-destructive">{errors.company}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium text-foreground/80">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v ?? '')}>
            <SelectTrigger className="h-10 text-[14px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {SIGNUP_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role && <p className="text-[12px] text-destructive">{errors.role}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium text-foreground/80">Portfolio size</Label>
          <Select value={size} onValueChange={(v) => setSize(v ?? '')}>
            <SelectTrigger className="h-10 text-[14px]">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {SIGNUP_PORTFOLIO_SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SIZE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.portfolioSize && <p className="text-[12px] text-destructive">{errors.portfolioSize}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message" className="text-[13px] font-medium text-foreground/80">
          Tell us about your portfolio <span className="text-muted-foreground/70">(optional)</span>
        </Label>
        <Textarea
          id="message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 500))}
          rows={4}
          className="text-[14px]"
          placeholder="What are you trying to solve?"
        />
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
          {message.length} / 500
        </div>
      </div>

      <label className="flex items-start gap-3 text-[13px] leading-[1.55]" style={{ color: 'rgba(0,16,48,0.75)' }}>
        <Checkbox
          checked={agree}
          onCheckedChange={(v) => setAgree(v === true)}
          className="mt-[3px]"
          aria-label="Agree to terms"
        />
        <span>
          I agree to the{' '}
          <Link href="/legal/terms" className="underline" style={{ color: '#002060' }}>
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="underline" style={{ color: '#002060' }}>
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {errors.agree && <p className="text-[12px] text-destructive">{errors.agree}</p>}

      {formError && <p className="text-[13px] text-destructive">{formError}</p>}

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 h-10 w-full gap-2 text-[15px] font-medium shadow-sm shadow-primary/25"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Sending…' : 'Request access'}
      </Button>

      <p className="text-center text-[13px]" style={{ color: 'rgba(0,16,48,0.55)' }}>
        Already have an account?{' '}
        <Link href="/login" className="underline" style={{ color: '#002060' }}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
