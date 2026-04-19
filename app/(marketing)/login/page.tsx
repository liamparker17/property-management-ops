import { Suspense } from 'react';
import Link from 'next/link';
import { Home, ShieldCheck, Building2, Users } from 'lucide-react';

import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-mesh-hero">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
      />
      <div aria-hidden className="animate-orb-float pointer-events-none absolute -top-32 -right-32 h-[40rem] w-[40rem] rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="animate-orb-drift pointer-events-none absolute -bottom-40 -left-32 h-[40rem] w-[40rem] rounded-full bg-violet-500/20 blur-3xl" style={{ animationDelay: '-6s' }} />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Left — value prop */}
        <aside className="hidden flex-col justify-between p-12 lg:flex">
          <Link href="/" className="inline-flex items-center gap-3 self-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
              <Home className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight">PMOps</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                Property Ops
              </span>
            </div>
          </Link>

          <div className="max-w-sm space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Trusted by South African landlords
            </div>
            <div className="space-y-4">
              <h2 className="text-[2.1rem] font-semibold leading-[1.15] tracking-tight text-foreground">
                Your portfolio,
                <br />
                <span className="bg-gradient-to-r from-primary via-violet-500 to-sky-500 bg-clip-text text-transparent">
                  always in motion.
                </span>
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Track every lease, tenant, and maintenance ticket from a single dashboard built for SA rentals.
              </p>
            </div>

            <ul className="space-y-5">
              <FeatureItem icon={Building2} title="Properties & units" description="Your entire portfolio in one clear, organised view." />
              <FeatureItem icon={Users} title="Tenant onboarding" description="From application to signed lease in under 5 minutes." />
              <FeatureItem icon={ShieldCheck} title="Lease safety" description="Every state transition logged. Full audit trail, always." />
            </ul>
          </div>

          <p className="text-[11px] text-muted-foreground/60">© {new Date().getFullYear()} PMOps · Built for SA rentals</p>
        </aside>

        {/* Right — login form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[22rem]">
            <Link href="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                <Home className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight">PMOps</span>
            </Link>

            <div className="rounded-2xl border border-white/20 bg-card/80 p-8 shadow-elevated backdrop-blur-xl">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
                <p className="mt-1.5 text-[15px] text-muted-foreground">Welcome back to your workspace.</p>
              </div>
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground/70">
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
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
      </div>
    </li>
  );
}
