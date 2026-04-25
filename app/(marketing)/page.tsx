import Link from 'next/link';
import { ArrowRight, ClipboardCheck, FileText, MessageSquareMore } from 'lucide-react';

import { PersonaValueGrid } from '@/components/marketing/persona-value-grid';
import { MARKETING_THEME as T } from '@/lib/marketing-theme';

export default function LandingPage() {
  return (
    <main style={{ background: T.creamSoft, color: T.ink }} className="font-sans">
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div
          className="relative flex min-h-[620px] flex-col justify-end overflow-hidden px-8 pb-16 pt-36 md:min-h-[720px] md:px-16 md:pb-20 md:pt-44"
          style={{ background: `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-8 select-none font-serif text-[300px] font-light leading-none md:text-[420px]"
            style={{ color: 'rgba(184,150,90,0.07)' }}
          >
            R
          </div>

          <div
            className="relative z-[1] mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-8" style={{ background: T.gold }} />
            Built for South African rental operations
          </div>
          <h1
            className="relative z-[1] mb-9 font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[78px]"
            style={{ color: T.cream }}
          >
            Property operations,
            <br />
            <em className="not-italic" style={{ fontStyle: 'italic', color: T.goldSoft }}>
              under
              <br />
              control.
            </em>
          </h1>
          <p
            className="relative z-[1] mb-12 max-w-md text-[14px] leading-[1.75]"
            style={{ color: T.textOnDark }}
          >
            Regalis consolidates applicant handling, tenant records, lease administration, maintenance,
            and billing into one disciplined operating layer for South African rental businesses.
          </p>
          <div className="relative z-[1] flex flex-wrap items-center gap-7">
            <Link
              href="/contact"
              className="cta-solid press group inline-flex items-center gap-2 overflow-hidden px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] no-underline"
              style={{ background: T.gold, color: T.ink }}
            >
              Talk to us <ArrowRight size={14} className="cta-arrow" />
            </Link>
            <Link
              href="/product"
              className="link-underline group press text-[12px] font-medium uppercase tracking-[0.12em] no-underline"
              style={{ color: T.textOnDark }}
            >
              See product <ArrowRight size={14} className="cta-arrow ml-1 inline-block" />
            </Link>
          </div>
        </div>

        <div
          className="relative flex flex-col justify-center px-8 py-20 md:px-16 md:py-[140px]"
          style={{ background: T.cream }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${T.gold}, ${T.inkMid})` }}
          />
          <div className="grid gap-0 py-10">
            {HERO_CARDS.map((card, index) => (
              <HeroCard key={card.title} last={index === HERO_CARDS.length - 1} {...card} />
            ))}
          </div>
        </div>
      </section>

      <div
        className="flex flex-col items-center gap-4 border-y px-6 py-8 text-center md:flex-row md:justify-center md:gap-10 md:py-6 md:text-left"
        style={{ background: T.creamAlt, borderColor: T.borderStrong }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: T.textMuted }}
        >
          Grounded in live operational workflows
        </span>
        <span className="hidden h-4 w-px md:block" style={{ background: T.borderStrong }} />
        <span className="font-serif text-[13px] italic" style={{ color: T.textSoft }}>
          Applications, onboarding, lease control, maintenance, invoices, and tenant-facing service.
        </span>
      </div>

      <section data-reveal className="px-6 py-24 md:grid md:grid-cols-2 md:gap-24 md:px-14 md:py-[120px]">
        <div className="mb-12 md:mb-0">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-6" style={{ background: T.gold }} />
            The problem
          </div>
          <h2
            className="mb-6 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: T.ink }}
          >
            When process lives across inboxes, PDFs, and spreadsheets, control degrades quickly.
          </h2>
          <ul className="space-y-4 text-[14px] leading-[1.7]" style={{ color: T.textSoft }}>
            {PROBLEMS.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: T.ink, opacity: 0.3 }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-6" style={{ background: T.gold }} />
            The outcome
          </div>
          <h2
            className="mb-6 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: T.inkSoft }}
          >
            A more controlled operating standard for the work your team already handles every day.
          </h2>
          <ul className="space-y-4 text-[14px] leading-[1.7]" style={{ color: T.textSoft }}>
            {OUTCOMES.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: T.gold }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-reveal id="features" className="px-6 py-24 md:px-14 md:py-[120px]" style={{ background: T.cream }}>
        <div className="mb-16 grid items-end gap-12 md:mb-20 md:grid-cols-2">
          <div>
            <div
              className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: T.gold }}
            >
              <span className="block h-px w-6" style={{ background: T.gold }} />
              Who is Regalis for?
            </div>
            <h2
              className="font-serif text-[36px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[48px] md:text-[58px]"
              style={{ color: T.ink }}
            >
              Select the role,
              <br />
              <em style={{ color: T.inkSoft }}>then review the value.</em>
            </h2>
          </div>
          <p className="max-w-md self-end text-[14px] leading-[1.8]" style={{ color: T.textSoft }}>
            Select the audience that matches your position. The chosen block expands into four concise
            value points tied to that role.
          </p>
        </div>

        <PersonaValueGrid />
      </section>

      <section data-reveal className="px-6 py-24 md:px-14 md:py-[120px]" style={{ background: `linear-gradient(180deg, ${T.ink}, ${T.inkSoft})` }}>
        <div className="mx-auto max-w-5xl">
          <div
            className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-8" style={{ background: T.gold }} />
            Where teams apply it
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {USE_CASES.map((item) => (
              <div
                key={item.title}
                className="border p-8"
                style={{ borderColor: 'rgba(245,241,234,0.14)', background: 'rgba(245,241,234,0.05)' }}
              >
                <h3 className="mb-4 font-serif text-[24px] font-light" style={{ color: T.cream }}>
                  {item.title}
                </h3>
                <p className="text-[14px] leading-[1.75]" style={{ color: T.textOnDark }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal className="relative overflow-hidden px-6 py-28 text-center md:px-14 md:py-[140px]" style={{ background: `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` }}>
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif text-[22vw] font-light tracking-[0.2em]"
          style={{ color: 'rgba(255,255,255,0.025)' }}
        >
          REGALIS
        </div>
        <div
          className="relative z-[1] mb-7 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: T.gold }}
        >
          <span className="block h-px w-8" style={{ background: T.gold }} />
          Assess operational fit
          <span className="block h-px w-8" style={{ background: T.gold }} />
        </div>
        <h2
          className="relative z-[1] mb-5 font-serif text-[40px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[56px] md:text-[72px]"
          style={{ color: T.cream }}
        >
          Assess whether Regalis suits
          <br />
          <em style={{ color: T.goldSoft }}>your operating model.</em>
        </h2>
        <p className="relative z-[1] mb-12 text-[14px] tracking-[0.02em]" style={{ color: T.textOnDarkMuted }}>
          We&apos;ll review your portfolio structure, current process, and the workflows the platform can
          support immediately.
        </p>
        <div className="relative z-[1] flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/contact"
            className="cta-solid press group inline-flex items-center gap-2 px-10 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline"
            style={{ background: T.gold, color: T.ink }}
          >
            Arrange a walkthrough <ArrowRight size={14} className="cta-arrow" />
          </Link>
          <Link
            href="/pricing"
            className="press inline-block border px-8 py-[15px] text-[12px] font-medium uppercase tracking-[0.14em] no-underline transition-colors duration-300 hover:bg-white/5 hover:border-white/40"
            style={{ color: T.textOnDark, borderColor: 'rgba(245,241,234,0.25)' }}
          >
            How pricing works
          </Link>
        </div>
      </section>
    </main>
  );
}

function HeroCard({
  title,
  desc,
  Icon,
  last,
}: {
  title: string;
  desc: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  last?: boolean;
}) {
  return (
    <div className="py-9" style={{ borderBottom: last ? 'none' : `1px solid ${T.border}` }}>
      <div className="mb-4 opacity-80">
        <Icon size={28} color={T.inkSoft} strokeWidth={1.5} />
      </div>
      <div className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: T.textMuted }}>
        {title}
      </div>
      <p className="mt-2 max-w-md text-[13px] leading-[1.6]" style={{ color: T.textSoft }}>
        {desc}
      </p>
    </div>
  );
}

const HERO_CARDS = [
  {
    title: 'Application control',
    desc: 'Capture applicants, review supporting material, assign reviewers, and move approved applicants into structured onboarding.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Lease administration',
    desc: 'Draft, activate, renew, terminate, and document leases without losing record integrity across the team.',
    Icon: FileText,
  },
  {
    title: 'Tenant service layer',
    desc: 'Provide one place for lease details, documents, repairs, invoices, and profile updates without routine back-and-forth.',
    Icon: MessageSquareMore,
  },
];

const PROBLEMS = [
  'Applicant notes live in one place, supporting documents in another, and the final decision is often retained informally.',
  'Lease renewals, signatures, and tenant communication become manual follow-up rather than controlled process.',
  'Tenants still call, email, or message for routine documents, repairs, and invoice questions that should be handled through a proper service layer.',
  'Month-end visibility arrives late because the operating record is fragmented.',
];

const OUTCOMES = [
  'Applicant review, notes, and decisions remain attached to the same record.',
  'Onboarding flows into unit assignment, draft lease setup, and portal access without duplication.',
  'Tenants can sign, review, log repairs, and check invoices from the same controlled interface.',
  'Staff retain visibility into expiries, overdue invoices, and maintenance status without reconstructing context.',
];

const USE_CASES = [
  {
    title: 'Tighten the handoff from approval to occupation',
    desc: 'Keep the tenant record, unit assignment, lease setup, and portal invitation connected instead of rebuilding the same information twice.',
  },
  {
    title: 'Reduce reactive tenant administration',
    desc: 'Give tenants a controlled place to access lease documents, log repairs, and review invoices so the office is not operating as a switchboard.',
  },
  {
    title: 'Run month-end with firmer visibility',
    desc: 'See what is expiring, what is overdue, and what still requires action without stitching together multiple administrative views.',
  },
];
