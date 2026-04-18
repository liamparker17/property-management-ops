import { Suspense } from 'react';
import Link from 'next/link';
import { Home, ShieldCheck, Building2, Users } from 'lucide-react';

import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-mesh-hero">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[36rem] w-[36rem] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-[36rem] w-[36rem] rounded-full bg-violet-500/15 blur-3xl"
      />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        <aside className="hidden flex-col justify-between p-10 lg:flex">
          <Link href="/" className="inline-flex items-center gap-2.5 self-start">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
              <Home className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight">PMOps</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Property Ops</span>
            </div>
          </Link>

          <div className="max-w-md space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Trusted by South African landlords
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your portfolio,
              <br />
              <span className="bg-gradient-to-r from-primary via-violet-500 to-sky-500 bg-clip-text text-transparent">
                always in motion.
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Track every lease, tenant, and maintenance ticket from a single calm dashboard built for SA rentals.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <FeatureItem icon={Building2}>Properties &amp; units in one tree</FeatureItem>
              <FeatureItem icon={Users}>Tenant onboarding in under 5 minutes</FeatureItem>
              <FeatureItem icon={ShieldCheck}>Lease state safety, audit trail included</FeatureItem>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} PMOps</p>
        </aside>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md animate-scale-in">
            <Link href="/" className="mb-6 inline-flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                <Home className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight">PMOps</span>
            </Link>
            <div className="rounded-2xl border border-border/60 bg-card/80 p-8 shadow-elevated backdrop-blur-xl">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in to your workspace to continue.
                </p>
              </div>
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Secure property management for South African rentals.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureItem({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </li>
  );
}
