import { Suspense } from 'react';
import Link from 'next/link';

import { SignupForm } from '@/components/signup-form';
import { MARKETING_THEME as T } from '@/lib/marketing-theme';

export default function SignupPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 pt-16 font-sans lg:grid-cols-[1.1fr_0.9fr] lg:pt-0">
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

        <div className="relative z-[1] max-w-[28rem] space-y-7">
          <div
            className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-8" style={{ background: T.gold }} />
            Start your trial
          </div>
          <h2
            className="font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] md:text-[56px]"
            style={{ color: T.cream }}
          >
            Move your portfolio
            <br />
            <em style={{ color: T.goldSoft }}>into one system.</em>
          </h2>
          <p className="max-w-sm text-[14px] leading-[1.75]" style={{ color: T.textOnDark }}>
            Tell us a little about your portfolio and we&apos;ll set you up. No credit card, free
            migration help, and a human to walk you through it.
          </p>

          <ul className="space-y-3 text-[13px]" style={{ color: T.textOnDark }}>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: T.gold }} />
              Built for SA rentals — TPN-ready, SARS-ready
            </li>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: T.gold }} />
              Trust accounting you can hand to an auditor
            </li>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: T.gold }} />
              Landlord &amp; tenant portals on day one
            </li>
          </ul>
        </div>

        <p
          className="relative z-[1] font-mono text-[10px] tracking-[0.15em]"
          style={{ color: T.textOnDarkMuted }}
        >
          Â© {new Date().getFullYear()} Regalis
        </p>
      </aside>

      <div
        className="flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center"
        style={{ background: T.cream }}
      >
        <div className="w-full max-w-[26rem]">
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5 no-underline lg:hidden">
            <span className="inline-flex overflow-hidden rounded-sm">
              <img src="/regalis.svg" alt="Regalis" className="h-11 w-auto object-contain" />
            </span>
            <span className="font-serif text-[20px] uppercase tracking-[0.08em]" style={{ color: T.ink }}>
              Regalis
            </span>
          </Link>

          <div
            className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-8" style={{ background: T.gold }} />
            Create your workspace
          </div>

          <h1
            className="mb-3 font-serif text-[40px] font-light leading-[1.05] tracking-[-0.01em]"
            style={{ color: T.ink }}
          >
            Request <em style={{ color: T.inkSoft }}>access.</em>
          </h1>
          <p className="mb-9 text-[14px] leading-[1.7]" style={{ color: T.textSoft }}>
            We review every request so your workspace is set up correctly. Expect a response within one
            business day.
          </p>

          <Suspense>
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
