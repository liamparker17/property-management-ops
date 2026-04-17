import Link from 'next/link';
import { ArrowRight, Building2, FileText, Home, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Home className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">PMOps</span>
        </div>
        <Link
          href="/login"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Sign in <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Built for South African rentals
        </div>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          Property management,
          <br />
          <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
            without the spreadsheets.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Manage your portfolio, tenants, and leases in one place. Track occupancy, renewals, and documents with clarity.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Sign in to your workspace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={Building2} title="Properties" desc="Track every property, unit, and address with full history." />
          <Feature icon={Users} title="Tenants" desc="Central tenant records with duplicate detection." />
          <Feature icon={FileText} title="Leases" desc="Draft, activate, renew, and terminate with state safety." />
          <Feature icon={Home} title="Occupancy" desc="Know what's vacant, upcoming, or conflicting at a glance." />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
