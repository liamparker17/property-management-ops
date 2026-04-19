import { Suspense } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';

import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background">

      {/* Grid — visible across the whole page, fades at edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-60 [mask-image:radial-gradient(ellipse_120%_100%_at_50%_0%,black_40%,transparent_100%)]"
      />

      {/* Color — centered behind the content, not hiding in corners */}
      <div aria-hidden className="animate-orb-float pointer-events-none absolute top-[-10%] left-[10%] h-[55rem] w-[55rem] rounded-full bg-primary/25 blur-[120px]" />
      <div aria-hidden className="animate-orb-drift pointer-events-none absolute top-[20%] right-[-5%] h-[40rem] w-[40rem] rounded-full bg-violet-500/20 blur-[100px]" style={{ animationDelay: '-7s' }} />
      <div aria-hidden className="animate-orb-float pointer-events-none absolute bottom-[-5%] left-[30%] h-[35rem] w-[35rem] rounded-full bg-sky-400/15 blur-[90px]" style={{ animationDelay: '-4s' }} />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">

        {/* Left — stripped back, let the background do the talking */}
        <aside className="hidden flex-col justify-between p-14 lg:flex">
          <Link href="/" className="inline-flex items-center gap-3 self-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/30">
              <Home className="h-4 w-4" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">PMOps</span>
          </Link>

          <div className="max-w-[22rem] space-y-6">
            <h2 className="text-5xl font-semibold leading-[1.1] tracking-tight text-foreground">
              Your portfolio,
              <br />
              <span className="bg-gradient-to-r from-primary via-violet-500 to-sky-400 bg-clip-text text-transparent">
                always in motion.
              </span>
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Leases, tenants, and maintenance — one focused workspace for South African property managers.
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground/50">© {new Date().getFullYear()} PMOps</p>
        </aside>

        {/* Right — form, clean surface, the grid shows through */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[21rem]">
            <Link href="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 text-primary-foreground">
                <Home className="h-4 w-4" />
              </div>
              <span className="font-semibold tracking-tight">PMOps</span>
            </Link>

            <div className="rounded-2xl border border-white/25 bg-background/70 px-8 py-9 shadow-2xl shadow-black/10 backdrop-blur-2xl">
              <div className="mb-7">
                <h1 className="text-[1.6rem] font-semibold tracking-tight">Sign in</h1>
                <p className="mt-1.5 text-[15px] text-muted-foreground">Welcome back to your workspace.</p>
              </div>
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
