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
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <span
            aria-disabled
            title="Contact your administrator to reset your password"
            className="cursor-not-allowed text-xs font-medium text-muted-foreground/70 opacity-70"
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
          className="h-10"
        />
      </div>
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className="mt-2 h-11 gap-2 shadow-md shadow-primary/20 transition-shadow hover:shadow-primary/30"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
