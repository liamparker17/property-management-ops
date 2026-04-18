import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  FileText,
  Home,
  Users,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-mesh-hero">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
            <Home className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">PMOps</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Property Ops</span>
          </div>
        </div>
        <Link
          href="/login"
          className={cn(buttonVariants({ size: 'lg' }), 'gap-1.5 shadow-sm')}
        >
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pt-16 pb-20 text-center sm:pt-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Built for South African rentals
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl animate-fade-in-up">
          Property management,
          <br />
          <span className="bg-gradient-to-r from-primary via-violet-500 to-sky-500 bg-clip-text text-transparent">
            without the spreadsheets.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground animate-fade-in-up [animation-delay:80ms]">
          Manage your portfolio, tenants, and leases in one place. Track occupancy, renewals, and documents with clarity.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-in-up [animation-delay:160ms]">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'group relative h-11 gap-2 px-6 text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-primary/30',
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-primary to-violet-500 opacity-0 blur-md transition-opacity group-hover:opacity-60"
            />
            Sign in to your workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <span className="text-xs text-muted-foreground">No credit card. Existing tenants &amp; staff only.</span>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Everything you need</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">One workspace, every move.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={Building2} title="Properties" desc="Track every property, unit, and address with full history." tone="primary" />
          <Feature icon={Users} title="Tenants" desc="Central tenant records with duplicate detection." tone="emerald" />
          <Feature icon={FileText} title="Leases" desc="Draft, activate, renew, and terminate with state safety." tone="violet" />
          <Feature icon={Wrench} title="Maintenance" desc="Tenant requests routed to the right person, every time." tone="amber" />
          <Feature icon={Home} title="Occupancy" desc="Know what's vacant, upcoming, or conflicting at a glance." tone="sky" />
          <Feature icon={ShieldCheck} title="Compliance" desc="South African rental defaults baked in. Less to remember." tone="emerald" />
          <Feature icon={Sparkles} title="Tenant portal" desc="Tenants sign leases, log repairs, and pay — without email tag." tone="violet" />
          <Feature icon={ArrowRight} title="Built for speed" desc="Finish onboarding in under five minutes, not five days." tone="primary" />
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/60 bg-muted/30 py-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Home className="h-3 w-3" />
            </div>
            <span className="font-medium text-foreground">PMOps</span>
          </div>
          <p>Built for South African rental properties.</p>
          <p>
            © {new Date().getFullYear()} PMOps · {' '}
            <Link href="/login" className="font-medium text-foreground transition-colors hover:text-primary">
              Sign in
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

const TONE: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

function Feature({
  icon: Icon,
  title,
  desc,
  tone = 'primary',
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  tone?: keyof typeof TONE;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/70 p-5 shadow-card backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-elevated">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
          TONE[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div
        aria-hidden
        className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </div>
  );
}
