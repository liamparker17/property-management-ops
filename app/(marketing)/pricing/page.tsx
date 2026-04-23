import Link from 'next/link';
import { ArrowRight, Check, MessageSquare, Settings2, Users } from 'lucide-react';

const INK = '#001030';
const TEAL = '#002060';
const CREAM = '#f5f1ea';
const GOLD = '#b8965a';
const GOLD_LT = '#d4b07a';

const SCOPES = [
  {
    title: 'Owner-managed portfolios',
    desc: 'For landlords who want proper structure around tenants, leases, invoices, and repair requests without building a big admin stack.',
    points: ['A tighter operational setup', 'Guidance on the workflows to start with', 'Pricing scoped around portfolio size and support needs'],
  },
  {
    title: 'Growing rental teams',
    desc: 'For property managers who need shared visibility across applicants, onboarding, active leases, tenant follow-up, and month-end admin.',
    points: ['Role-based staff access', 'Operational workflows matched to the current team shape', 'Room to expand the rollout over time'],
  },
  {
    title: 'Agency operations',
    desc: 'For agencies with more moving parts, more handoffs, and a stronger need for rollout planning, data setup, and implementation support.',
    points: ['Scoping based on portfolio complexity', 'Rollout planning and migration discussion', 'Commercials handled directly with the team'],
  },
];

const FACTORS = [
  {
    title: 'Portfolio size',
    desc: 'The number of active units and leases still matters, but it is not the only driver.',
    Icon: Users,
  },
  {
    title: 'Operating model',
    desc: 'A self-managing landlord and a multi-person rental team need different workflow depth and support.',
    Icon: Settings2,
  },
  {
    title: 'Workflow scope',
    desc: 'Some teams start with core lease and tenant workflows, others want applicant review and repairs in the initial rollout.',
    Icon: MessageSquare,
  },
];

const FAQ = [
  {
    q: 'Do you publish fixed pricing?',
    a: 'Not at this stage. We scope pricing around your portfolio, team setup, and the workflows you want to use first.',
  },
  {
    q: 'How do I get a quote?',
    a: 'Send us a note through the contact page and we will set up a short conversation about your portfolio, current process, and rollout needs.',
  },
  {
    q: 'Can smaller landlords use Regalis?',
    a: 'Yes, if you are actively managing rental operations and want a more structured way to run them.',
  },
  {
    q: 'Can we start small and expand later?',
    a: 'Yes. We can scope around the workflows that matter most now and revisit the rest as your operation grows.',
  },
  {
    q: 'Will pricing depend on implementation support?',
    a: 'Yes. The level of setup help, import support, and rollout planning can change the scope.',
  },
];

export default function PricingPage() {
  return (
    <main style={{ background: '#fdfcfa', color: INK }} className="font-sans">
      <section
        className="relative overflow-hidden px-6 pb-20 pt-36 text-center md:px-14 md:pb-24 md:pt-48"
        style={{ background: TEAL }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div
          className="relative z-[1] mb-6 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: GOLD }}
        >
          <span className="block h-px w-8" style={{ background: GOLD }} />
          Pricing
          <span className="block h-px w-8" style={{ background: GOLD }} />
        </div>
        <h1
          className="relative z-[1] mx-auto max-w-3xl font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[72px]"
          style={{ color: CREAM }}
        >
          Pricing shaped around your portfolio, <em style={{ color: GOLD_LT }}>not a generic tier table.</em>
        </h1>
        <p
          className="relative z-[1] mx-auto mt-6 max-w-2xl text-[14px] leading-[1.75]"
          style={{ color: 'rgba(245,241,234,0.7)' }}
        >
          We scope pricing based on the size of the portfolio, the way your team operates, and how much rollout support you need.
        </p>
      </section>

      <section className="px-6 py-20 md:px-14 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {SCOPES.map((scope, index) => (
            <div
              key={scope.title}
              className="flex flex-col border p-8 transition"
              style={{
                borderColor: index === 1 ? GOLD : `${INK}1f`,
                background: index === 1 ? CREAM : '#fdfcfa',
                boxShadow: index === 1 ? `0 0 0 1px ${GOLD}` : 'none',
              }}
            >
              <h2 className="font-serif text-[24px]" style={{ color: INK }}>
                {scope.title}
              </h2>
              <p className="mt-3 text-[13px] leading-[1.65]" style={{ color: 'rgba(0,16,48,0.65)' }}>
                {scope.desc}
              </p>

              <ul className="mt-8 flex-1 space-y-3">
                {scope.points.map((point) => (
                  <li key={point} className="flex gap-3 text-[13px] leading-[1.55]" style={{ color: 'rgba(0,16,48,0.8)' }}>
                    <Check size={16} className="mt-[2px] flex-shrink-0" color={TEAL} strokeWidth={2} />
                    {point}
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] no-underline transition"
                style={{
                  background: index === 1 ? INK : 'transparent',
                  color: index === 1 ? '#fdfcfa' : INK,
                  border: index === 1 ? 'none' : `1px solid ${INK}`,
                }}
              >
                Contact us <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 md:px-14 md:py-24" style={{ background: CREAM }}>
        <div className="mx-auto max-w-5xl">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-6" style={{ background: GOLD }} />
            How pricing is scoped
          </div>
          <h2
            className="mb-10 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: INK }}
          >
            We look at the operation as a whole, not just a unit count.
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {FACTORS.map((factor) => (
              <div key={factor.title} className="border p-8" style={{ borderColor: `${INK}1f`, background: '#fdfcfa' }}>
                <div className="mb-5 opacity-80">
                  <factor.Icon size={28} color={TEAL} strokeWidth={1.5} />
                </div>
                <h3 className="mb-3 font-serif text-[24px]" style={{ color: INK }}>
                  {factor.title}
                </h3>
                <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.68)' }}>
                  {factor.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-6 py-20 md:px-14 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-6" style={{ background: GOLD }} />
            Frequently asked
          </div>
          <h2
            className="mb-10 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: INK }}
          >
            What to expect from the pricing conversation.
          </h2>

          <div className="divide-y" style={{ borderColor: `${INK}1f` }}>
            {FAQ.map((item, index) => (
              <details
                key={item.q}
                className="group py-5"
                style={{ borderTop: index === 0 ? `1px solid ${INK}1f` : 'none', borderBottom: `1px solid ${INK}1f` }}
              >
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium"
                  style={{ color: INK }}
                >
                  <span>{item.q}</span>
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center font-mono text-[16px] transition group-open:rotate-45"
                    style={{ color: GOLD }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.7)' }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-24 text-center md:px-14 md:py-[120px]" style={{ background: INK }}>
        <h2
          className="mb-5 font-serif text-[36px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[52px]"
          style={{ color: CREAM }}
        >
          Want a quote that matches the way you actually operate?
        </h2>
        <p className="mb-10 text-[14px]" style={{ color: 'rgba(245,241,234,0.6)' }}>
          Tell us about your portfolio and we&apos;ll talk through fit, rollout, and commercials.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-10 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
          style={{ background: GOLD, color: INK }}
        >
          Contact us <ArrowRight size={14} />
        </Link>
      </section>
    </main>
  );
}
