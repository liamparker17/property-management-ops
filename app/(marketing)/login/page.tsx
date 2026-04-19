import { Suspense } from 'react';
import Link from 'next/link';
import { Home, ShieldCheck, Building2, Users } from 'lucide-react';

import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen bg-background lg:grid-cols-2">
      {/* Subtle glow behind the form — barely there, just enough warmth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-login-glow"
      />

      {/* Left panel */}
      <aside className="relative hidden flex-col justify-between border-r border-border/50 bg-muted/25 px-12 py-10 lg:flex">
        <Link href="/" className="inline-flex items-center gap-3 self-start">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <Home className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight">PMOps</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/80">
              Property Management
            </span>
          </div>
        </Link>

        <div className="max-w-xs space-y-8">
          <div className="space-y-4">
            <h2 className="text-[2.15rem] font-semibold leading-[1.15] tracking-tight text-foreground">
              Property management,
              <br />
              <span className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
                done properly.
              </span>
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Leases, tenants, and maintenance — unified in one focused workspace built for South African rentals.
            </p>
          </div>

          <ul className="space-y-5">
            <FeatureItem
              icon={Building2}
              title="Properties & units"
              description="Your entire portfolio in one clear, organised view."
            />
            <FeatureItem
              icon={Users}
              title="Tenant onboarding"
              description="From application to signed lease in under 5 minutes."
            />
            <FeatureItem
              icon={ShieldCheck}
              title="Lease safety"
              description="Every state transition logged. Full audit trail, always."
            />
          </ul>
        </div>

        <p className="text-[11px] text-muted-foreground/60">
          © {new Date().getFullYear()} PMOps · Built for SA rentals
        </p>
      </aside>

      {/* Right panel — form */}
      <div className="relative flex items-center justify-center px-8 py-12 sm:px-16">
        <div className="w-full max-w-[22rem]">
          {/* Mobile logo */}
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <Home className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">PMOps</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-[1.6rem] font-semibold tracking-tight text-foreground">Sign in</h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">Welcome back to your workspace.</p>
          </div>

          <Suspense>
            <LoginForm />
          </Suspense>
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
