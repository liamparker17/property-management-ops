import { Suspense } from 'react';
import Link from 'next/link';

import { SignupForm } from '@/components/signup-form';

const INK = '#001030';
const TEAL = '#002060';
const CREAM = '#f5f1ea';
const GOLD = '#b8965a';
const GOLD_LT = '#d4b07a';

export default function SignupPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 pt-16 font-sans lg:grid-cols-[1.1fr_0.9fr] lg:pt-0">
      {/* ── Editorial panel ── */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden px-14 py-16 lg:flex"
        style={{ background: TEAL }}
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
            <img src="/regalis.svg" alt="Regalis" className="h-10 w-auto object-contain" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[22px] font-normal uppercase tracking-[0.08em]" style={{ color: CREAM }}>
              Regalis
            </span>
            <span className="mt-[2px] font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>
              Property Ops
            </span>
          </span>
        </Link>

        <div className="relative z-[1] max-w-[28rem] space-y-7">
          <div
            className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-8" style={{ background: GOLD }} />
            Start your trial
          </div>
          <h2
            className="font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] md:text-[56px]"
            style={{ color: CREAM }}
          >
            Move your portfolio
            <br />
            <em style={{ color: GOLD_LT }}>into the light.</em>
          </h2>
          <p className="max-w-sm text-[14px] leading-[1.75]" style={{ color: 'rgba(245,241,234,0.7)' }}>
            Tell us a little about your portfolio and we&apos;ll set you up. No credit card, free
            migration help, and a human to walk you through it.
          </p>

          <ul className="space-y-3 text-[13px]" style={{ color: 'rgba(245,241,234,0.65)' }}>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: GOLD }} />
              Built for SA rentals — TPN-ready, SARS-ready
            </li>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: GOLD }} />
              Trust accounting you can hand to an auditor
            </li>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: GOLD }} />
              Landlord &amp; tenant portals on day one
            </li>
          </ul>
        </div>

        <p
          className="relative z-[1] font-mono text-[10px] tracking-[0.15em]"
          style={{ color: 'rgba(245,241,234,0.3)' }}
        >
          © {new Date().getFullYear()} Regalis
        </p>
      </aside>

      {/* ── Form panel ── */}
      <div
        className="flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center"
        style={{ background: CREAM }}
      >
        <div className="w-full max-w-[26rem]">
          <Link href="/" className="mb-10 inline-flex items-center gap-2.5 no-underline lg:hidden">
            <span className="inline-flex overflow-hidden rounded-sm">
              <img src="/regalis.svg" alt="Regalis" className="h-9 w-auto object-contain" />
            </span>
            <span className="font-serif text-[20px] uppercase tracking-[0.08em]" style={{ color: INK }}>
              Regalis
            </span>
          </Link>

          <div
            className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-8" style={{ background: GOLD }} />
            Create your workspace
          </div>

          <h1
            className="mb-3 font-serif text-[40px] font-light leading-[1.05] tracking-[-0.01em]"
            style={{ color: INK }}
          >
            Request <em style={{ color: TEAL }}>access.</em>
          </h1>
          <p className="mb-9 text-[14px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.65)' }}>
            We review every request so your workspace is set up right. Expect a response within one
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
