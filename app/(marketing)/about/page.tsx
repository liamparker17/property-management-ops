import Link from 'next/link';
import { ArrowRight, Scale, Eye, Heart, ShieldCheck } from 'lucide-react';

import { MarketingJourneyGrid } from '@/components/marketing/marketing-journey-grid';
import { MARKETING_THEME as T } from '@/lib/marketing-theme';

const ABOUT_PATHS = [
  {
    href: '#why-we-built-it',
    label: 'Start here',
    title: 'Why this exists',
    desc: 'A quick read on the gap we think rental teams in South Africa still deal with every day.',
  },
  {
    href: '/product#portfolio-structure',
    label: 'Product',
    title: 'See how it shows up in the product',
    desc: 'Move into the product page if you want to see how that thinking becomes actual workflow.',
  },
  {
    href: '/pricing#how-pricing-is-scoped',
    label: 'Commercials',
    title: 'See how rollout is scoped',
    desc: 'If the approach already feels right, the pricing page gives the next layer without turning into a hard sell.',
  },
];

export default function AboutPage() {
  return (
    <main style={{ background: T.creamSoft, color: T.ink }} className="font-sans">
      <section
        className="relative overflow-hidden px-6 pb-24 pt-36 md:px-14 md:pb-32 md:pt-48"
        style={{ background: `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div className="relative z-[1] mx-auto max-w-3xl">
          <div
            className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-8" style={{ background: T.gold }} />
            About Regalis
          </div>
          <h1
            className="font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[64px] md:text-[80px]"
            style={{ color: T.cream }}
          >
            Regalis is built for{' '}
            <em style={{ color: T.goldSoft }}>South African property management.</em>
          </h1>
        </div>
      </section>

      <MarketingJourneyGrid
        eyebrow="Start here"
        title="A little context goes a long way."
        items={ABOUT_PATHS}
      />

      <section data-reveal id="why-we-built-it" className="px-6 py-24 md:grid md:grid-cols-[1fr_2fr] md:gap-20 md:px-14 md:py-[120px]">
        <div className="mb-10 md:mb-0">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-6" style={{ background: T.gold }} />
            Why we built it
          </div>
          <h2
            className="font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: T.ink }}
          >
            Because most rental software was not built for <em style={{ color: T.inkSoft }}>this market.</em>
          </h2>
        </div>
        <div className="space-y-6 text-[15px] leading-[1.75]" style={{ color: T.textSoft }}>
          <p>
            A lot of the property software used in South Africa was designed somewhere else, around someone
            else&apos;s rules, banking rails, and reporting assumptions. So teams end up doing the real work
            in spreadsheets, inboxes, and message threads.
          </p>
          <p>
            We&apos;ve spent years inside that reality, managing portfolios, prepping for audits, working
            through mandates, and feeling the drag created by software that never quite fits the way local
            teams actually operate. Regalis is the platform we wanted to use ourselves: one clean record,
            better flow across the team, and portals that do what they should.
          </p>
          <p>
            We&apos;re building for the property manager with a compact portfolio, the managing agent working
            across multiple principals, and the agency handling serious monthly volume. Different scale,
            same pressure.
          </p>
        </div>
      </section>

      <section data-reveal id="principles" className="px-6 py-24 md:px-14 md:py-[120px]" style={{ background: T.cream }}>
        <div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <div
            className="mb-4 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-6" style={{ background: T.gold }} />
            What we believe
            <span className="block h-px w-6" style={{ background: T.gold }} />
          </div>
          <h2
            className="font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[44px]"
            style={{ color: T.ink }}
          >
            The standards behind the product.
          </h2>
        </div>

        <div className="grid gap-0 md:grid-cols-2" style={{ border: `1px solid ${T.borderStrong}`, background: T.creamSoft }}>
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className="p-9"
              style={{
                borderRight: i % 2 === 0 ? `1px solid ${T.borderStrong}` : 'none',
                borderBottom: i < 2 ? `1px solid ${T.borderStrong}` : 'none',
              }}
            >
              <div className="mb-5 opacity-80">
                <p.Icon size={28} color={T.inkSoft} strokeWidth={1.5} />
              </div>
              <h3 className="mb-3 font-serif text-[22px] leading-tight" style={{ color: T.ink }}>
                {p.title}
              </h3>
              <p className="text-[13px] leading-[1.7]" style={{ color: T.textSoft }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal id="team" className="px-6 py-24 md:px-14 md:py-[120px]">
        <div className="mx-auto max-w-3xl">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-6" style={{ background: T.gold }} />
            The team
          </div>
          <h2
            className="mb-10 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: T.ink }}
          >
            Built by people who know the work.
          </h2>

          <div
            className="flex flex-col gap-6 border p-8 md:flex-row md:items-center md:gap-10 md:p-10"
            style={{ borderColor: T.borderStrong, background: T.cream }}
          >
            <div
              className="h-20 w-20 flex-shrink-0 rounded-full"
              style={{ background: T.ink, border: `1px solid ${T.gold}` }}
            />
            <div>
              <p className="mb-3 font-serif text-[20px] leading-[1.4]" style={{ color: T.ink }}>
                Regalis comes from a small team with experience across property operations and
                financial-services software.
              </p>
              <p className="text-[13px] leading-[1.7]" style={{ color: T.textSoft }}>
                We&apos;re based in South Africa, we know the local regulatory shape, and we build for the
                realities rental teams deal with every month.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section data-reveal className="relative overflow-hidden px-6 py-24 text-center md:px-14 md:py-[120px]" style={{ background: `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` }}>
        <div
          className="relative z-[1] mb-7 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: T.gold }}
        >
          <span className="block h-px w-8" style={{ background: T.gold }} />
          Continue
          <span className="block h-px w-8" style={{ background: T.gold }} />
        </div>
        <h2
          className="relative z-[1] mb-10 font-serif text-[32px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[48px]"
          style={{ color: T.cream }}
        >
          If you want to see whether it fits your team, the next step is easy.
        </h2>
        <Link
          href="/contact#message"
          className="cta-solid press group relative z-[1] inline-flex items-center gap-2 px-9 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline"
          style={{ background: T.gold, color: T.ink }}
        >
          Start a conversation <ArrowRight size={14} className="cta-arrow" />
        </Link>
      </section>
    </main>
  );
}

const PRINCIPLES = [
  {
    title: 'Clean trust separation',
    desc: 'Keep tenant money, landlord balances, and the operating record clearly separated so the financial picture stays easier to manage.',
    Icon: Scale,
  },
  {
    title: 'Shared visibility',
    desc: 'Give landlords a clearer view of statements, occupancy, and arrears without turning every update into a manual follow-up.',
    Icon: Eye,
  },
  {
    title: 'Better tenant service',
    desc: 'Give tenants one place for leases, repairs, and payments so routine admin moves faster and the office absorbs less noise.',
    Icon: Heart,
  },
  {
    title: 'Compliance by default',
    desc: 'Build rental, privacy, audit, and reporting requirements into the workflow from the start instead of layering them on later.',
    Icon: ShieldCheck,
  },
];
