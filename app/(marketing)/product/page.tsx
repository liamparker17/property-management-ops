import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquareMore,
  ReceiptText,
  UserPlus,
} from 'lucide-react';

import { MarketingJourneyGrid } from '@/components/marketing/marketing-journey-grid';
import { MARKETING_THEME as T } from '@/lib/marketing-theme';

type Section = {
  id: string;
  no: string;
  title: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  blurb: string[];
  bullets: string[];
};

const SECTIONS: Section[] = [
  {
    id: 'portfolio-structure',
    no: '01',
    title: 'Portfolio in one view',
    Icon: LayoutDashboard,
    blurb: [
      'Properties, units, tenants, and leases sit in one place instead of being split across spreadsheets, inboxes, and private working notes.',
      'That gives the team a clearer view of occupancy, lease history, and portfolio exposure before downstream admin even starts.',
    ],
    bullets: [
      'Property and unit records with lease history',
      'Tenant records linked to documents and active leases',
      'Dashboard visibility into occupancy, expiries, and arrears',
    ],
  },
  {
    id: 'applications-review',
    no: '02',
    title: 'Applications without the mess',
    Icon: ClipboardCheck,
    blurb: [
      'Capture an applicant, store supporting documents, assign a reviewer, and keep the decision trail in one record.',
      'The result is a cleaner intake flow, with less ambiguity around what has been submitted, what is missing, and what still needs a call.',
    ],
    bullets: [
      'Applicant and application records with stage tracking',
      'Document upload and internal notes in context',
      'Reviewer assignment, approval, decline, and withdrawal flows',
    ],
  },
  {
    id: 'tenant-onboarding',
    no: '03',
    title: 'From approval to move-in',
    Icon: UserPlus,
    blurb: [
      'Once an applicant is approved, Regalis carries the handoff into onboarding instead of forcing staff to restart in a separate admin flow.',
      'Create the tenant, assign the unit, generate a draft lease, and prepare portal access from one connected path.',
    ],
    bullets: [
      'Onboard-tenant flow tied to the unit and lease',
      'Draft lease creation with key commercial terms',
      'Portal invite support as part of onboarding',
    ],
  },
  {
    id: 'lease-control',
    no: '04',
    title: 'Leases without loose ends',
    Icon: FileText,
    blurb: [
      'Leases do not stop being operational once they are signed. Drafts, renewals, terminations, and supporting documents stay attached to the same history.',
      'That keeps the lease record, uploaded documents, signatures, and review requests connected over time.',
    ],
    bullets: [
      'Draft, active, renewed, and terminated lease states',
      'Lease document upload and supporting file access',
      'Tenant signature and review-request workflow',
    ],
  },
  {
    id: 'tenant-service',
    no: '05',
    title: 'Tenant self-service',
    Icon: MessageSquareMore,
    blurb: [
      'The tenant portal gives residents a place for lease details, documents, repairs, invoices, and profile data without routing routine admin through the office.',
      'That gives tenants a cleaner experience and takes a lot of avoidable follow-up off the team.',
    ],
    bullets: [
      'Tenant access to lease details and documents',
      'Repair request submission and request history',
      'Invoice list and profile self-service views',
    ],
  },
  {
    id: 'rent-operations',
    no: '06',
    title: 'Rent at a glance',
    Icon: ReceiptText,
    blurb: [
      'Regalis supports recurring lease invoices and gives staff visibility into what is due, paid, overdue, or still unresolved.',
      'Paired with maintenance status and lease-expiry views, that gives the team a much sharper picture of what needs attention now.',
    ],
    bullets: [
      'Lease invoice generation and payment status updates',
      'Overdue account visibility and cashflow views by unit',
      'Shared staff dashboard for operational follow-up',
    ],
  },
];

const PRODUCT_PATHS = [
  {
    href: '#portfolio-structure',
    label: 'Start here',
    title: 'Start with the core record',
    desc: 'Begin with the shared record across properties, units, tenants, and leases before moving into workflow detail.',
  },
  {
    href: '#tenant-onboarding',
    label: 'Most asked about',
    title: 'See the move-in flow',
    desc: 'Follow the path from approved applicant to tenant setup, draft lease, and portal access.',
  },
  {
    href: '/pricing#how-pricing-is-scoped',
    label: 'Commercials',
    title: 'See how rollout is scoped',
    desc: 'Review how portfolio shape, team structure, and workflow depth shape the commercial conversation.',
  },
];

const PRODUCT_NEXT_STEPS = [
  {
    href: '/pricing#who-its-for',
    label: 'Next read',
    title: 'See which setup fits best',
    desc: 'The pricing page points you into the right commercial lane rather than a generic plan table.',
  },
  {
    href: '/about#why-we-built-it',
    label: 'Background',
    title: 'Read the thinking behind Regalis',
    desc: 'If you want the point of view behind the product, the about page is the shortest route.',
  },
  {
    href: '/contact#message',
    label: 'Direct route',
    title: 'Book a focused walkthrough',
    desc: 'When you have seen enough, move straight into a conversation about fit and rollout.',
  },
];

export default function ProductPage() {
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
            Product overview
          </div>
          <h1
            className="mb-7 font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[76px]"
            style={{ color: T.cream }}
          >
            One system for the rental operation you already run.
          </h1>
          <p className="max-w-xl text-[15px] leading-[1.75]" style={{ color: T.textOnDark }}>
            Regalis is built for the real spine of a South African rental portfolio: applicant intake,
            onboarding, leases, tenant service, repairs, invoices, and shared visibility across the record.
          </p>
        </div>
      </section>

      <MarketingJourneyGrid
        eyebrow="Start anywhere"
        title="You can begin with the part of the platform that feels most familiar."
        description="These entry points keep the first pass light while still giving you the detail that matters."
        items={PRODUCT_PATHS}
      />

      <div className="px-6 md:px-14">
        {SECTIONS.map((section, index) => (
          <section
            key={section.no}
            id={section.id}
            className="grid gap-12 border-b py-20 md:grid-cols-[1fr_2fr] md:gap-20 md:py-[120px]"
            style={{ borderColor: T.border }}
          >
            <div>
              <div className="mb-5 font-mono text-[10px] tracking-[0.18em]" style={{ color: T.gold }}>
                {section.no}
              </div>
              <div className="mb-6 opacity-80">
                <section.Icon size={36} color={T.inkSoft} strokeWidth={1.5} />
              </div>
              <h2
                className="font-serif text-[32px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[40px]"
                style={{ color: index % 2 === 0 ? T.ink : T.inkSoft }}
              >
                {section.title}
              </h2>
            </div>

            <div>
              <div className="space-y-5 text-[15px] leading-[1.75]" style={{ color: T.textSoft }}>
                {section.blurb.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-9 border-t pt-7" style={{ borderColor: T.border }}>
                <div
                  className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: T.gold }}
                >
                  In the product today
                </div>
                <ul className="space-y-2.5">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-3 text-[14px] leading-[1.6]"
                      style={{ color: T.textSoft }}
                    >
                      <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: T.gold }} />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      <MarketingJourneyGrid
        eyebrow="Keep going"
        title="From here, it gets more specific."
        description="If you want to go further, these paths take you into commercials, company context, or a direct conversation."
        items={PRODUCT_NEXT_STEPS}
      />

      <section
        className="relative overflow-hidden px-6 py-24 text-center md:px-14 md:py-[120px]"
        style={{ background: `linear-gradient(180deg, ${T.ink}, ${T.inkDeep})` }}
      >
        <h2
          className="mb-5 font-serif text-[36px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[52px]"
          style={{ color: T.cream }}
        >
          Start with the part of the operation you want to tighten up first.
        </h2>
        <p className="mb-10 text-[14px]" style={{ color: T.textOnDarkMuted }}>
          We&apos;ll look at your portfolio, your current process, and the cleanest place to begin.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/contact#message"
            className="inline-flex items-center gap-2 px-9 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
            style={{ background: T.gold, color: T.ink }}
          >
            Arrange a walkthrough <ArrowRight size={14} />
          </Link>
          <Link
            href="/pricing#how-pricing-is-scoped"
            className="border px-8 py-[15px] text-[12px] font-medium uppercase tracking-[0.14em] no-underline"
            style={{ color: T.textOnDark, borderColor: 'rgba(245,241,234,0.25)' }}
          >
            Pricing approach
          </Link>
        </div>
      </section>
    </main>
  );
}
