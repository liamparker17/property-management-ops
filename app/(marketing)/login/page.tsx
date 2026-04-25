import { Suspense } from 'react';
import Link from 'next/link';

import { LoginForm } from '@/components/login-form';
import { MARKETING_THEME as T } from '@/lib/marketing-theme';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 font-sans lg:grid-cols-[1.1fr_0.9fr]">
      <aside
        className="relative hidden flex-col justify-between overflow-hidden px-14 py-16 lg:flex"
        style={{ background: `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 select-none font-serif text-[420px] font-light leading-none"
          style={{ color: 'rgba(184,150,90,0.07)' }}
        >
          R
        </div>

        <Link href="/" className="relative z-[1] inline-flex items-center gap-3 self-start no-underline">
          <span className="inline-flex overflow-hidden rounded-sm bg-white">
            <img src="/regalis.svg" alt="Regalis" className="h-12 w-auto object-contain" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[22px] font-normal uppercase tracking-[0.08em]" style={{ color: T.cream }}>
              Regalis
            </span>
            <span className="mt-[2px] font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: T.gold }}>
              Property Ops
            </span>
          </span>
        </Link>

        <div className="relative z-[1] max-w-[26rem] space-y-7">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: T.gold }}>
            <span className="block h-px w-8" style={{ background: T.gold }} />
            Welcome back
          </div>
          <h2 className="font-serif text-[48px] font-light leading-[1.08] tracking-[-0.01em] md:text-[60px]" style={{ color: T.cream }}>
            Return to the
            <br />
            <em style={{ color: T.goldSoft }}>workspace.</em>
          </h2>
          <p className="max-w-sm text-[14px] leading-[1.75]" style={{ color: T.textOnDark }}>
            Leases, tenants, and maintenance â€” one focused workspace for South African property managers.
          </p>
        </div>

        <p className="relative z-[1] font-mono text-[10px] tracking-[0.15em]" style={{ color: T.textOnDarkMuted }}>
          Â© {new Date().getFullYear()} Regalis
        </p>
      </aside>

      <div className="flex items-center justify-center px-6 py-10 sm:px-10" style={{ background: T.cream }}>
        <div className="w-full max-w-[22rem]">
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5 no-underline lg:hidden">
            <span className="inline-flex overflow-hidden rounded-sm">
              <img src="/regalis.svg" alt="Regalis" className="h-11 w-auto object-contain" />
            </span>
            <span className="font-serif text-[20px] uppercase tracking-[0.08em]" style={{ color: T.ink }}>
              Regalis
            </span>
          </Link>

          <div className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: T.gold }}>
            <span className="block h-px w-8" style={{ background: T.gold }} />
            Sign in
          </div>

          <h1 className="mb-3 font-serif text-[44px] font-light leading-[1.05] tracking-[-0.01em]" style={{ color: T.ink }}>
            Enter the
            <br />
            <em style={{ color: T.inkSoft }}>workspace.</em>
          </h1>
          <p className="mb-9 text-[14px] leading-[1.7]" style={{ color: T.textMuted }}>
            Existing tenants and staff only.
          </p>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
