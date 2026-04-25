'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MARKETING_THEME as T } from '@/lib/marketing-theme';

type FieldErrors = Partial<Record<string, string>>;

export function ContactForm() {
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
      subject: String(data.get('subject') ?? ''),
      message: String(data.get('message') ?? ''),
    };

    try {
      const res = await fetch('/api/public/contact', {
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
      <div className="animate-fade-in-up flex flex-col gap-3 border p-6" style={{ borderColor: T.borderStrong, background: T.creamSoft }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: T.gold }}>
          Message received
        </div>
        <h2 className="font-serif text-[22px] leading-tight" style={{ color: T.ink }}>
          Message received.
        </h2>
        <p className="text-[13px] leading-[1.7]" style={{ color: T.textSoft }}>
          A member of our team will respond within one business day.
        </p>
        <div className="mt-2 text-[13px]">
          <Link href="/" className="link-underline" style={{ color: T.inkSoft }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="c-name" className="text-[13px] font-medium text-foreground/80">
          Name
        </Label>
        <Input id="c-name" name="name" required className="h-10 text-[15px]" />
        {errors.name && <p className="text-[12px] text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-email" className="text-[13px] font-medium text-foreground/80">
          Email
        </Label>
        <Input
          id="c-email"
          name="email"
          type="email"
          required
          className="h-10 text-[15px]"
          placeholder="you@company.co.za"
        />
        {errors.email && <p className="text-[12px] text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-subject" className="text-[13px] font-medium text-foreground/80">
          Subject
        </Label>
        <Input id="c-subject" name="subject" required className="h-10 text-[15px]" />
        {errors.subject && <p className="text-[12px] text-destructive">{errors.subject}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="c-message" className="text-[13px] font-medium text-foreground/80">
          Message
        </Label>
        <Textarea id="c-message" name="message" required rows={6} className="text-[14px]" />
        {errors.message && <p className="text-[12px] text-destructive">{errors.message}</p>}
      </div>

      {formError && <p className="text-[13px] text-destructive">{formError}</p>}

      <Button
        type="submit"
        disabled={pending}
        className="press cta-solid mt-1 h-10 w-full gap-2 text-[15px] font-medium shadow-sm shadow-primary/25"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
