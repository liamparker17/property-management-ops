import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquareMore,
  ReceiptText,
  Users,
  Wrench,
} from 'lucide-react';

const INK = '#001030';
const TEAL = '#002060';
const CREAM = '#f5f1ea';
const CREAM_D = '#ede8df';
const GOLD = '#b8965a';
const GOLD_LT = '#d4b07a';

export default function LandingPage() {
  return (
    <main style={{ background: '#fdfcfa', color: INK }} className="font-sans">
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div
          className="relative flex min-h-[620px] flex-col justify-end overflow-hidden px-8 pb-16 pt-36 md:min-h-[720px] md:px-16 md:pb-20 md:pt-44"
          style={{ background: TEAL }}
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
            style={{ color: GOLD }}
          >
            <span className="block h-px w-8" style={{ background: GOLD }} />
            Built for South African rental operations
          </div>
          <h1
            className="relative z-[1] mb-9 font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[78px]"
            style={{ color: CREAM }}
          >
            Property management,
            <br />
            <em className="not-italic" style={{ fontStyle: 'italic', color: GOLD_LT }}>
              without the
              <br />
              scramble.
            </em>
          </h1>
          <p
            className="relative z-[1] mb-12 max-w-md text-[14px] leading-[1.75]"
            style={{ color: 'rgba(245,241,234,0.68)' }}
          >
            Regalis gives property managers and self-managing landlords one place to run applicant
            review, tenant onboarding, leases, maintenance, invoices, and day-to-day portfolio follow-up.
          </p>
          <div className="relative z-[1] flex flex-wrap items-center gap-7">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 overflow-hidden px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] no-underline"
              style={{ background: GOLD, color: INK }}
            >
              Talk to us <ArrowRight size={14} />
            </Link>
            <Link
              href="/product"
              className="group text-[12px] font-medium uppercase tracking-[0.12em] no-underline transition"
              style={{ color: 'rgba(245,241,234,0.68)' }}
            >
              See product <span className="ml-1 inline-block transition group-hover:translate-x-1">-&gt;</span>
            </Link>
          </div>
        </div>

        <div
          className="relative flex flex-col justify-center px-8 py-20 md:px-16 md:py-[140px]"
          style={{ background: CREAM }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${TEAL})` }}
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
        style={{ background: CREAM_D, borderColor: `${INK}1f` }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: 'rgba(0,16,48,0.55)' }}
        >
          Grounded in the workflows already inside Regalis
        </span>
        <span className="hidden h-4 w-px md:block" style={{ background: `${INK}33` }} />
        <span className="font-serif text-[13px] italic" style={{ color: 'rgba(0,16,48,0.65)' }}>
          Applications, onboarding, leases, invoices, repairs, and tenant-facing self-service.
        </span>
      </div>

      <section className="px-6 py-24 md:grid md:grid-cols-2 md:gap-24 md:px-14 md:py-[120px]">
        <div className="mb-12 md:mb-0">
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-6" style={{ background: GOLD }} />
            The problem
          </div>
          <h2
            className="mb-6 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: INK }}
          >
            Too many rental teams are still stitching the day together across inboxes, PDFs, and spreadsheets.
          </h2>
          <ul className="space-y-4 text-[14px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.65)' }}>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: INK, opacity: 0.3 }} />
              Applicant notes live in one place, supporting documents in another, and the final decision in someone&apos;s head.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: INK, opacity: 0.3 }} />
              Lease renewals, signatures, and tenant communications become manual follow-ups instead of a tracked process.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: INK, opacity: 0.3 }} />
              Tenants still phone, email, and WhatsApp for documents, repairs, and invoice questions that should be self-service.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: INK, opacity: 0.3 }} />
              Month-end visibility arrives late because the operational trail is fragmented.
            </li>
          </ul>
        </div>

        <div>
          <div
            className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-6" style={{ background: GOLD }} />
            The outcome
          </div>
          <h2
            className="mb-6 font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[42px]"
            style={{ color: TEAL }}
          >
            A single operating view for the work your team already does every day.
          </h2>
          <ul className="space-y-4 text-[14px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.65)' }}>
            {OUTCOMES.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: GOLD }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="features" className="px-6 py-24 md:px-14 md:py-[120px]" style={{ background: CREAM }}>
        <div className="mb-16 grid items-end gap-12 md:mb-20 md:grid-cols-2">
          <div>
            <div
              className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: GOLD }}
            >
              <span className="block h-px w-6" style={{ background: GOLD }} />
              What the platform covers
            </div>
            <h2
              className="font-serif text-[36px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[48px] md:text-[58px]"
              style={{ color: INK }}
            >
              One workspace,
              <br />
              <em style={{ color: TEAL }}>the right operational depth.</em>
            </h2>
          </div>
          <p className="max-w-md self-end text-[14px] leading-[1.8]" style={{ color: 'rgba(0,16,48,0.65)' }}>
            The current product is strongest where rental teams lose time: intake, onboarding, lease admin,
            tenant follow-up, repairs, and rent visibility.
          </p>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          style={{ border: `1px solid ${INK}1f`, background: '#fdfcfa' }}
        >
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden p-9 transition hover:bg-[#f5f1ea]"
              style={{ borderRight: `1px solid ${INK}1f`, borderBottom: `1px solid ${INK}1f` }}
            >
              <span
                aria-hidden
                className="absolute bottom-0 left-0 right-full h-0.5 transition-all duration-500 group-hover:right-0"
                style={{ background: GOLD }}
              />
              <span className="mb-6 block font-mono text-[10px] tracking-[0.15em]" style={{ color: GOLD }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="mb-5 opacity-80">
                <feature.Icon size={28} color={TEAL} strokeWidth={1.5} />
              </div>
              <h3 className="mb-3 text-[15px] font-semibold tracking-[0.02em]" style={{ color: INK }}>
                {feature.title}
              </h3>
              <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.65)' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 md:px-14 md:py-[120px]">
        <div className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <div
            className="mb-4 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-6" style={{ background: GOLD }} />
            Who it&apos;s for
            <span className="block h-px w-6" style={{ background: GOLD }} />
          </div>
          <h2
            className="font-serif text-[32px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[44px]"
            style={{ color: INK }}
          >
            Built for operators who are tired of running rentals by memory.
          </h2>
        </div>

        <div className="grid gap-0 md:grid-cols-3" style={{ border: `1px solid ${INK}1f` }}>
          {AUDIENCES.map((audience) => (
            <div key={audience.title} className="p-9" style={{ borderRight: `1px solid ${INK}1f` }}>
              <div className="mb-6 opacity-80">
                <audience.Icon size={28} color={TEAL} strokeWidth={1.5} />
              </div>
              <h3 className="mb-3 font-serif text-[22px] leading-tight" style={{ color: INK }}>
                {audience.title}
              </h3>
              <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.65)' }}>
                {audience.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 md:px-14 md:py-[120px]" style={{ background: TEAL }}>
        <div className="mx-auto max-w-5xl">
          <div
            className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-8" style={{ background: GOLD }} />
            What teams use it for
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {USE_CASES.map((item) => (
              <div
                key={item.title}
                className="border p-8"
                style={{ borderColor: 'rgba(245,241,234,0.16)', background: 'rgba(245,241,234,0.04)' }}
              >
                <h3 className="mb-4 font-serif text-[24px] font-light" style={{ color: CREAM }}>
                  {item.title}
                </h3>
                <p className="text-[14px] leading-[1.75]" style={{ color: 'rgba(245,241,234,0.72)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-28 text-center md:px-14 md:py-[140px]" style={{ background: INK }}>
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif text-[22vw] font-light tracking-[0.2em]"
          style={{ color: 'rgba(255,255,255,0.025)' }}
        >
          REGALIS
        </div>
        <div
          className="relative z-[1] mb-7 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
          style={{ color: GOLD }}
        >
          <span className="block h-px w-8" style={{ background: GOLD }} />
          Start with the workflows that matter most
          <span className="block h-px w-8" style={{ background: GOLD }} />
        </div>
        <h2
          className="relative z-[1] mb-5 font-serif text-[40px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[56px] md:text-[72px]"
          style={{ color: CREAM }}
        >
          See whether Regalis fits
          <br />
          <em style={{ color: GOLD_LT }}>your operating model.</em>
        </h2>
        <p className="relative z-[1] mb-12 text-[14px] tracking-[0.02em]" style={{ color: 'rgba(245,241,234,0.58)' }}>
          We&apos;ll walk through your portfolio, your current process, and where the platform helps first.
        </p>
        <div className="relative z-[1] flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-10 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
            style={{ background: GOLD, color: INK }}
          >
            Contact us <ArrowRight size={14} />
          </Link>
          <Link
            href="/pricing"
            className="inline-block border px-8 py-[15px] text-[12px] font-medium uppercase tracking-[0.14em] no-underline transition"
            style={{ color: 'rgba(245,241,234,0.68)', borderColor: 'rgba(245,241,234,0.25)' }}
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
    <div className="py-9" style={{ borderBottom: last ? 'none' : '1px solid rgba(0,32,96,0.12)' }}>
      <div className="mb-4 opacity-80">
        <Icon size={28} color={TEAL} strokeWidth={1.5} />
      </div>
      <div className="text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(0,16,48,0.55)' }}>
        {title}
      </div>
      <p className="mt-2 max-w-md text-[13px] leading-[1.6]" style={{ color: 'rgba(0,16,48,0.62)' }}>
        {desc}
      </p>
    </div>
  );
}

const HERO_CARDS = [
  {
    title: 'Applications to onboarding',
    desc: 'Capture applicants, review documents, assign reviewers, and convert approved applicants into tenants and draft leases.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Lease admin in one place',
    desc: 'Draft, activate, renew, terminate, and document leases without losing the operational thread between staff and tenants.',
    Icon: FileText,
  },
  {
    title: 'Tenant-facing self-service',
    desc: 'Give tenants one place for lease details, documents, repairs, invoices, and profile updates instead of endless back-and-forth.',
    Icon: MessageSquareMore,
  },
];

const OUTCOMES = [
  'Applicant review, notes, and decisions stay attached to the same record.',
  'Onboarding flows into unit assignment, draft lease setup, and portal access.',
  'Tenants can sign, review, log repairs, and check invoices from the same portal.',
  'Staff get visibility into expiries, overdue invoices, and maintenance status without hunting for context.',
];

const FEATURES = [
  {
    title: 'Applications & review',
    desc: 'Capture applicants, collect supporting documents, assign reviewers, add notes, and move applications through a structured pipeline.',
    Icon: ClipboardCheck,
  },
  {
    title: 'Tenant onboarding',
    desc: 'Create the tenant, assign the unit, start the draft lease, and set up portal access from one workflow.',
    Icon: Users,
  },
  {
    title: 'Lease lifecycle',
    desc: 'Manage draft, active, renewed, and terminated leases with supporting documents, signatures, and review requests in context.',
    Icon: FileText,
  },
  {
    title: 'Tenant portal',
    desc: 'Tenants can view documents, follow lease details, raise maintenance requests, and check invoice history without emailing the office.',
    Icon: MessageSquareMore,
  },
  {
    title: 'Maintenance tracking',
    desc: 'Repairs are logged by the tenant and updated by staff with priority, status, notes, and a visible service trail.',
    Icon: Wrench,
  },
  {
    title: 'Invoices & dashboard visibility',
    desc: 'Track lease invoices, overdue amounts, expiry windows, occupancy, and cashflow views from the operational dashboard.',
    Icon: ReceiptText,
  },
];

const AUDIENCES = [
  {
    title: 'Property managers',
    desc: 'For teams juggling applications, leases, rent follow-up, and repairs across a live rental portfolio.',
    Icon: LayoutDashboard,
  },
  {
    title: 'Self-managing landlords',
    desc: 'For owners who want more structure than spreadsheets without adding heavyweight process.',
    Icon: Users,
  },
  {
    title: 'Lean operations teams',
    desc: 'For small teams that need shared visibility, cleaner follow-up, and fewer handoffs between admin work and tenant communication.',
    Icon: ClipboardCheck,
  },
];

const USE_CASES = [
  {
    title: 'Shorten the handoff from approval to occupation',
    desc: 'Keep the tenant record, unit assignment, lease setup, and portal invitation connected instead of rebuilding the same information twice.',
  },
  {
    title: 'Make tenant communication less reactive',
    desc: 'Give tenants a proper place to find lease documents, log repairs, and view invoices so the office is not acting as a switchboard.',
  },
  {
    title: 'Run month-end with better operational context',
    desc: 'See what is expiring, what is overdue, and what still needs attention without stitching together four different admin views.',
  },
];
