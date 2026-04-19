'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const search = useSearchParams();
  const from = search.get('from') ?? '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await signIn('credentials', {
        email: form.get('email'),
        password: form.get('password'),
        redirect: false,
      });
      if (res?.error) {
        setPending(false);
        setError('Invalid email or password');
        return;
      }
    } catch {
      setPending(false);
      setError('Invalid email or password');
      return;
    }
    window.location.href = from;
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[13px] font-medium text-foreground/80">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="h-10 bg-background text-[15px] placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-[13px] font-medium text-foreground/80">
            Password
          </Label>
          <span
            aria-disabled
            title="Contact your administrator to reset your password"
            className="cursor-not-allowed text-[12px] text-muted-foreground/50"
          >
            Forgot password?
          </span>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-10 bg-background text-[15px] placeholder:text-muted-foreground/50"
        />
      </div>

      {error && (
        <p className="text-[13px] text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="mt-1 h-10 w-full gap-2 text-[15px] font-medium shadow-sm shadow-primary/25"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
