import Link from 'next/link';
import { ArrowRight, Check, MessageSquare, Settings2, Users } from 'lucide-react';

import { MarketingJourneyGrid } from '@/components/marketing/marketing-journey-grid';
import { MARKETING_THEME as T } from '@/lib/marketing-theme';

const SCOPES = [
  {
    title: 'Independent portfolios',
    href: '/product#rent-operations',
    cta: 'Review the workflows',
    desc: 'For landlords who want firmer structure around tenants, leases, invoices, and repair requests without building a heavy administrative stack.',
    points: [
      'A cleaner day-to-day setup',
      'Guidance on where to start',
      'Commercial scope matched to size and support needs',
    ],
  },
  {
    title: 'Growing teams',
    href: '/product#tenant-onboarding',
    cta: 'See the handoff',
    desc: 'For property managers who need shared visibility across applicants, onboarding, active leases, tenant follow-up, and month-end administration.',
    points: [
      'Role-based staff access',
      'Workflows shaped around the current team',
      'Room to expand over time',
    ],
  },
  {
    title: 'Scaled agency teams',
    href: '/contact#message',
    cta: 'Arrange a discussion',
    desc: 'For agencies with more moving parts, more handoffs, and a stronger need for rollout planning, data setup, and implementation support.',
    points: [
      'Scope shaped around portfolio complexity',
      'Rollout planning and migration discussion',
      'Commercials handled directly with the team',
    ],
  },
];

const FACTORS = [
  {
    title: 'Portfolio size',
    desc: 'The number of active units and leases matters, but it is not the only driver.',
    Icon: Users,
  },
  {
    title: 'Team shape',
    desc: 'A self-managing landlord and a multi-person rental team require different workflow depth, control, and support.',
    Icon: Settings2,
  },
  {
    title: 'What you want live first',
    desc: 'Some teams start with core lease and tenant workflows. Others want applicant review and repairs in the initial rollout.',
    Icon: MessageSquare,
  },
];

const FAQ = [
  {
    q: 'Do you publish fixed pricing?',
    a: 'Not at this stage. We scope pricing around your portfolio, team setup, and the workflows you want live first.',
  },
  {
    q: 'How do I get a quote?',
    a: 'Send us a note through the contact page and we&apos;ll set up a short conversation about your portfolio, current process, and rollout needs.',
  },
  {
    q: 'Can smaller landlords use Regalis?',
    a: 'Yes, if you are actively managing rental operations and want a more structured way to run them.',
  },
  {
    q: 'Can we start small and expand later?',
    a: 'Yes. We can scope around the workflows that matter most now and revisit the rest as the operation grows.',
  },
  {
    q: 'Will pricing depend on implementation support?',
    a: 'Yes. The level of setup help, import support, and rollout planning can change the commercial scope.',
  },
];

const PRICING_PATHS = [
  {
    href: '#who-its-for',
    label: 'Start here',
    title: 'Identify the closest operating profile',
    desc: 'Begin with the profile that feels closest to the way your business runs now.',
  },
  {
    href: '#how-pricing-is-scoped',
    label: 'Commercial logic',
    title: 'See what actually drives scope',
    desc: 'Pricing is shaped by more than unit count, and the scoping section shows you why.',
  },
  {
    href: '/product#tenant-onboarding',
    label: 'Before pricing',
    title: 'Review the rollout path first',
    desc: 'If you want product context before commercial detail, start with onboarding and lease administration.',
  },
];

const PRICING_NEXT_STEPS = [
  {
    href: '/product#applications-review',
    label: 'Read next',
    title: 'Go deeper on the workflows',
    desc: 'The product page is broken into sections so you can review only the layer you care about.',
  },
  {
    href: '/about#why-we-built-it',
    label: 'Context',
    title: 'Read the thinking behind the product',
    desc: 'The about page explains the local operating pressures the product is designed around.',
  },
  {
    href: '/contact#message',
    label: 'Direct route',
    title: 'Move into a pricing conversation',
    desc: 'If the commercial shape already feels right, continue straight into a focused outreach step.',
  },
];

export default function PricingPage() {
  return (
    <main style={{ background: T.creamSoft, color: T.ink }} className="font-sans">
      <section
        className="relative overflow-hidden px-6 pb-20 pt-36 text-center md:px-14 md:pb-24 md:pt-48"
        style={{ background: `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div
          className="relative z-[1] mb-6 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: T.gold }}
        >
          <span className="block h-px w-8" style={{ background: T.gold }} />
          Pricing
          <span className="block h-px w-8" style={{ background: T.gold }} />
        </div>
        <h1
          className="relative z-[1] mx-auto max-w-3xl font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[72px]"
          style={{ color: T.cream }}
        >
          Pricing shaped around your operation, <em style={{ color: T.goldSoft }}>not a one-size-fits-all tier table.</em>
        </h1>
        <p
          className="relative z-[1] mx-auto mt-6 max-w-2xl text-[14px] leading-[1.75]"
          style={{ color: T.textOnDark }}
        >
          We scope pricing around portfolio size, team shape, workflow depth, and the level of rollout support you need.
        </p>
      </section>

      <MarketingJourneyGrid
        eyebrow="Start with fit"
        title="Pricing makes more sense once you come in from the right angle."
        description="These paths help the commercial picture click faster, whether you are looking at fit, scope, or rollout."
        items={PRICING_PATHS}
      />

      <section id="who-its-for" className="px-6 py-20 md:px-14 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {SCOPES.map((scope, index) => (
            <div
              key={scope.title}
              className="flex flex-col border p-8 transition"
              style={{
                borderColor: index === 1 ? T.gold : T.borderStrong,
                background: index === 1 ? T.cream : T.creamSoft,
                boxShadow: index === 1 ? `0 0 0 1px ${T.gold}` : 'none',
              }}
            >
              <h2 className="font-serif text-[24px]" style={{ color: T.ink }}>
                {scope.title}
              </h2>
              <p className="mt-3 text-[13px] leading-[1.65]" style={{ color: T.textSoft }}>
                {scope.desc}
              </p>

              <ul className="mt-8 flex-1 space-y-3">
                {scope.points.map((point) => (
                  <li key={point} className="flex gap-3 text-[13px] leading-[1.55]" style={{ color: T.textSoft }}>
                    <Check size={16} className="mt-[2px] flex-shrink-0" color={T.inkSoft} strokeWidth={2} />
                    {point}
                  </li>
                ))}
              </ul>

              <Link
                href={scope.href}
                className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] no-underline transition"
                style={{
                  background: index === 1 ? T.ink : 'transparent',
                  color: index === 1 ? T.creamSoft : T.ink,
                  border: index === 1 ? 'none' : `1px solid ${T.ink}`,
                }}
              >
                {scope.cta} <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="how-pricing-is-scoped" className="px-6 py-20 md:px-14 md:py-24" style={{ background: T.cream }}>
        <div className="mx-auto max-w-5xl">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-6" style={{ background: T.gold }} />
            How pricing is scoped
          </div>
          <h2
            className="mb-10 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: T.ink }}
          >
            We look at the operation as a whole, not just a door count.
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {FACTORS.map((factor) => (
              <div key={factor.title} className="border p-8" style={{ borderColor: T.borderStrong, background: T.creamSoft }}>
                <div className="mb-5 opacity-80">
                  <factor.Icon size={28} color={T.inkSoft} strokeWidth={1.5} />
                </div>
                <h3 className="mb-3 font-serif text-[24px]" style={{ color: T.ink }}>
                  {factor.title}
                </h3>
                <p className="text-[13px] leading-[1.7]" style={{ color: T.textSoft }}>
                  {factor.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingJourneyGrid
        eyebrow="Keep going"
        title="From here, you can get a little more specific."
        description="You might prefer to look at the workflow detail, read the company context, or move quietly into a conversation."
        items={PRICING_NEXT_STEPS}
      />

      <section id="faq" className="px-6 py-20 md:px-14 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-6" style={{ background: T.gold }} />
            Frequently asked
          </div>
          <h2
            className="mb-10 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: T.ink }}
          >
            What to expect from the pricing conversation.
          </h2>

          <div className="divide-y" style={{ borderColor: T.borderStrong }}>
            {FAQ.map((item, index) => (
              <details
                key={item.q}
                className="group py-5"
                style={{
                  borderTop: index === 0 ? `1px solid ${T.borderStrong}` : 'none',
                  borderBottom: `1px solid ${T.borderStrong}`,
                }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium" style={{ color: T.ink }}>
                  <span>{item.q}</span>
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center font-mono text-[16px] transition group-open:rotate-45"
                    style={{ color: T.gold }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: T.textSoft }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-24 text-center md:px-14 md:py-[120px]" style={{ background: `linear-gradient(180deg, ${T.ink}, ${T.inkDeep})` }}>
        <h2
          className="mb-5 font-serif text-[36px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[52px]"
          style={{ color: T.cream }}
        >
          Want pricing that actually fits the way you run?
        </h2>
        <p className="mb-10 text-[14px]" style={{ color: T.textOnDarkMuted }}>
          Tell us about your portfolio and we&apos;ll talk through fit, rollout, and scope.
        </p>
        <Link
          href="/contact#message"
          className="inline-flex items-center gap-2 px-10 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
          style={{ background: T.gold, color: T.ink }}
        >
          Arrange a conversation <ArrowRight size={14} />
        </Link>
      </section>
    </main>
  );
}
