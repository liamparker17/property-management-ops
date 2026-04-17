import { Suspense } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Home className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">PMOps</span>
        </Link>
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue.</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure property management for South African rentals.
        </p>
      </div>
    </main>
  );
}
