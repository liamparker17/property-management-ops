import Link from 'next/link';
import { ArrowRight, Scale, Eye, Heart, ShieldCheck } from 'lucide-react';

const INK = '#001030';
const TEAL = '#002060';
const CREAM = '#f5f1ea';
const GOLD = '#b8965a';
const GOLD_LT = '#d4b07a';

export default function AboutPage() {
  return (
    <main style={{ background: '#fdfcfa', color: INK }} className="font-sans">
      {/* HERO */}
      <section
        className="relative overflow-hidden px-6 pb-24 pt-36 md:px-14 md:pb-32 md:pt-48"
        style={{ background: TEAL }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div className="relative z-[1] mx-auto max-w-3xl">
          <div
            className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-8" style={{ background: GOLD }} />
            About Regalis
          </div>
          <h1
            className="font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[64px] md:text-[80px]"
            style={{ color: CREAM }}
          >
            We build the operating system for{' '}
            <em style={{ color: GOLD_LT }}>South African property management.</em>
          </h1>
        </div>
      </section>

      {/* WHY WE BUILT IT */}
      <section className="px-6 py-24 md:grid md:grid-cols-[1fr_2fr] md:gap-20 md:px-14 md:py-[120px]">
        <div className="mb-10 md:mb-0">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-6" style={{ background: GOLD }} />
            Why we built it
          </div>
          <h2
            className="font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: INK }}
          >
            Because the current tools weren&apos;t built for <em style={{ color: TEAL }}>here.</em>
          </h2>
        </div>
        <div className="space-y-6 text-[15px] leading-[1.75]" style={{ color: 'rgba(0,16,48,0.75)' }}>
          <p>
            The property management software most South African agencies use was built somewhere else —
            for someone else&apos;s laws, someone else&apos;s banking rails, and someone else&apos;s idea of
            what &ldquo;trust accounting&rdquo; means. The result is predictable: every agency bolts on
            spreadsheets, WhatsApp groups, and a Dropbox folder called &ldquo;STATEMENTS_FINAL_v3.&rdquo;
          </p>
          <p>
            We&apos;ve spent years inside that reality — managing portfolios, sitting through EAAB
            audits, chasing DebiCheck mandates, and trying to explain to a landlord at 9pm on the 1st
            why their statement still isn&apos;t in their inbox. Regalis is the software we wished
            existed: one ledger of record, trust accounting that behaves, landlord and tenant portals
            that work, and a maintenance workflow that governs itself.
          </p>
          <p>
            We&apos;re building for the property manager running 12 units out of a home office, the
            managing agent servicing 40 principals, and the agency closing 300+ doors every month.
            Different scale, same problems — and all of them deserve better tools.
          </p>
        </div>
      </section>

      {/* WHAT WE BELIEVE */}
      <section className="px-6 py-24 md:px-14 md:py-[120px]" style={{ background: CREAM }}>
        <div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <div
            className="mb-4 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-6" style={{ background: GOLD }} />
            What we believe
            <span className="block h-px w-6" style={{ background: GOLD }} />
          </div>
          <h2
            className="font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[44px]"
            style={{ color: INK }}
          >
            Four principles we&apos;re not prepared to compromise on.
          </h2>
        </div>

        <div className="grid gap-0 md:grid-cols-2" style={{ border: `1px solid ${INK}1f`, background: '#fdfcfa' }}>
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className="p-9"
              style={{
                borderRight: i % 2 === 0 ? `1px solid ${INK}1f` : 'none',
                borderBottom: i < 2 ? `1px solid ${INK}1f` : 'none',
              }}
            >
              <div className="mb-5 opacity-80">
                <p.Icon size={28} color={TEAL} strokeWidth={1.5} />
              </div>
              <h3 className="mb-3 font-serif text-[22px] leading-tight" style={{ color: INK }}>
                {p.title}
              </h3>
              <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.65)' }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* TEAM */}
      <section className="px-6 py-24 md:px-14 md:py-[120px]">
        <div className="mx-auto max-w-3xl">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-6" style={{ background: GOLD }} />
            The team
          </div>
          <h2
            className="mb-10 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: INK }}
          >
            Founded by a team of property managers and engineers.
          </h2>

          <div
            className="flex flex-col gap-6 border p-8 md:flex-row md:items-center md:gap-10 md:p-10"
            style={{ borderColor: `${INK}1f`, background: CREAM }}
          >
            <div
              className="h-20 w-20 flex-shrink-0 rounded-full"
              style={{ background: TEAL, border: `1px solid ${GOLD}` }}
            />
            <div>
              <p className="mb-3 font-serif text-[20px] leading-[1.4]" style={{ color: INK }}>
                Regalis is built by a small team that&apos;s split time between property management
                operations and building software for financial services.
              </p>
              <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.65)' }}>
                We&apos;re based in South Africa, we know the Rental Housing Act, and we&apos;ve sat on
                both sides of an EAAB audit. We build what we wish we&apos;d had.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden px-6 py-24 text-center md:px-14 md:py-[120px]" style={{ background: INK }}>
        <div
          className="relative z-[1] mb-7 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: GOLD }}
        >
          <span className="block h-px w-8" style={{ background: GOLD }} />
          Let&apos;s talk
          <span className="block h-px w-8" style={{ background: GOLD }} />
        </div>
        <h2
          className="relative z-[1] mb-10 font-serif text-[32px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[48px]"
          style={{ color: CREAM }}
        >
          Questions about the platform, pricing, or onboarding?
        </h2>
        <Link
          href="/contact"
          className="relative z-[1] inline-flex items-center gap-2 px-9 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
          style={{ background: GOLD, color: INK }}
        >
          Get in touch <ArrowRight size={14} />
        </Link>
      </section>
    </main>
  );
}

const PRINCIPLES = [
  {
    title: 'Trust accounting is sacred',
    desc: "Deposit money belongs to tenants. Landlord money belongs to landlords. We never blur the lines, and our ledgers make sure you don't either.",
    Icon: Scale,
  },
  {
    title: 'Landlords deserve visibility',
    desc: 'Statements, occupancy, and arrears should never be the property manager’s private knowledge. Landlords log in, see everything, and stop guessing.',
    Icon: Eye,
  },
  {
    title: 'Tenants deserve respect',
    desc: 'Tenants are not a support ticket. They get a real portal — for leases, repairs, and payments — that treats them like a person, not an inbox.',
    Icon: Heart,
  },
  {
    title: 'Compliance is non-negotiable',
    desc: 'Rental Housing Act, POPIA, EAAB, SARS, FICA — we do the boring work so you can pass the audit without a weekend of spreadsheet archaeology.',
    Icon: ShieldCheck,
  },
];
