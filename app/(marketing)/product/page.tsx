import Link from 'next/link';
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquareMore,
  ReceiptText,
  UserPlus,
  Wrench,
} from 'lucide-react';

const INK = '#001030';
const TEAL = '#002060';
const CREAM = '#f5f1ea';
const GOLD = '#b8965a';
const GOLD_LT = '#d4b07a';

type Section = {
  no: string;
  title: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  blurb: string[];
  bullets: string[];
};

const SECTIONS: Section[] = [
  {
    no: '01',
    title: 'Portfolio structure',
    Icon: LayoutDashboard,
    blurb: [
      'Properties, units, tenants, and leases live in a shared operational model instead of being spread across disconnected spreadsheets and folders.',
      'That gives the team one place to understand occupancy, lease history, and who belongs to which unit before any downstream work even starts.',
    ],
    bullets: [
      'Property and unit records with lease history',
      'Tenant records linked to documents and active leases',
      'Dashboard visibility into occupancy, expiries, and arrears',
    ],
  },
  {
    no: '02',
    title: 'Applications & review',
    Icon: ClipboardCheck,
    blurb: [
      'Capture an applicant, store their supporting documents, assign a reviewer, and keep the notes and decision trail in one record.',
      'The workflow is designed to keep intake structured and visible, so staff can see what has been submitted, what is missing, and what still needs a decision.',
    ],
    bullets: [
      'Applicant and application records with stage tracking',
      'Document upload and internal notes in context',
      'Reviewer assignment, approval, decline, and withdrawal flows',
    ],
  },
  {
    no: '03',
    title: 'Tenant onboarding & lease setup',
    Icon: UserPlus,
    blurb: [
      'Once an applicant is approved, Regalis supports the handoff into tenant onboarding instead of making the team start over in a separate admin flow.',
      'Create the tenant, assign the unit, generate a draft lease, and prepare portal access from a single operational path.',
    ],
    bullets: [
      'Onboard tenant flow tied to the unit and lease',
      'Draft lease creation with key commercial terms',
      'Portal invite support as part of onboarding',
    ],
  },
  {
    no: '04',
    title: 'Lease lifecycle & documents',
    Icon: FileText,
    blurb: [
      'Leases do not stop being operational once they are signed. Drafts, renewals, terminations, and supporting documents stay attached to the same lease history.',
      'Staff can keep the lease record, uploaded documents, signatures, and review requests together so the operational trail remains intact over time.',
    ],
    bullets: [
      'Draft, active, renewed, and terminated lease states',
      'Lease document upload and supporting file access',
      'Tenant signature and review-request workflow',
    ],
  },
  {
    no: '05',
    title: 'Tenant portal & service requests',
    Icon: MessageSquareMore,
    blurb: [
      'The tenant portal gives residents a place to view lease details, documents, repairs, invoices, and their profile without emailing the office for routine admin.',
      'That creates a cleaner service experience for the tenant and reduces the amount of manual status chasing your team has to do.',
    ],
    bullets: [
      'Tenant access to lease details and documents',
      'Repair request submission and request history',
      'Invoice list and profile self-service views',
    ],
  },
  {
    no: '06',
    title: 'Rent operations & follow-up',
    Icon: ReceiptText,
    blurb: [
      'Regalis supports recurring lease invoices and gives staff visibility into what is due, paid, overdue, or still unresolved.',
      'Combined with maintenance status and lease expiry views, this gives operators a more complete picture of what needs attention right now.',
    ],
    bullets: [
      'Lease invoice generation and payment status updates',
      'Overdue account visibility and cashflow views by unit',
      'Shared staff dashboard for operational follow-up',
    ],
  },
];

export default function ProductPage() {
  return (
    <main style={{ background: '#fdfcfa', color: INK }} className="font-sans">
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
            The platform, in detail
          </div>
          <h1
            className="mb-7 font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[76px]"
            style={{ color: CREAM }}
          >
            A clearer operating layer for the rental work you already do.
          </h1>
          <p className="max-w-xl text-[15px] leading-[1.75]" style={{ color: 'rgba(245,241,234,0.7)' }}>
            Regalis is strongest where rental teams lose time today: structured intake, tenant onboarding,
            lease admin, tenant communication, repairs, invoices, and operational visibility.
          </p>
        </div>
      </section>

      <div className="px-6 md:px-14">
        {SECTIONS.map((section, index) => (
          <section
            key={section.no}
            className="grid gap-12 border-b py-20 md:grid-cols-[1fr_2fr] md:gap-20 md:py-[120px]"
            style={{ borderColor: `${INK}1a` }}
          >
            <div>
              <div className="mb-5 font-mono text-[10px] tracking-[0.18em]" style={{ color: GOLD }}>
                {section.no}
              </div>
              <div className="mb-6 opacity-80">
                <section.Icon size={36} color={TEAL} strokeWidth={1.5} />
              </div>
              <h2
                className="font-serif text-[32px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[40px]"
                style={{ color: index % 2 === 0 ? INK : TEAL }}
              >
                {section.title}
              </h2>
            </div>

            <div>
              <div className="space-y-5 text-[15px] leading-[1.75]" style={{ color: 'rgba(0,16,48,0.75)' }}>
                {section.blurb.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-9 border-t pt-7" style={{ borderColor: `${INK}1a` }}>
                <div
                  className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: GOLD }}
                >
                  What this looks like in practice
                </div>
                <ul className="space-y-2.5">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex gap-3 text-[14px] leading-[1.6]"
                      style={{ color: 'rgba(0,16,48,0.75)' }}
                    >
                      <span className="mt-2 block h-px w-4 flex-shrink-0" style={{ background: GOLD }} />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section
        className="relative overflow-hidden px-6 py-24 text-center md:px-14 md:py-[120px]"
        style={{ background: INK }}
      >
        <h2
          className="mb-5 font-serif text-[36px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[52px]"
          style={{ color: CREAM }}
        >
          Start with the operational bottleneck you want to clean up first.
        </h2>
        <p className="mb-10 text-[14px]" style={{ color: 'rgba(245,241,234,0.6)' }}>
          We&apos;ll walk through your portfolio, your current process, and the best place to begin.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-9 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition hover:brightness-110"
            style={{ background: GOLD, color: INK }}
          >
            Contact us <ArrowRight size={14} />
          </Link>
          <Link
            href="/pricing"
            className="border px-8 py-[15px] text-[12px] font-medium uppercase tracking-[0.14em] no-underline"
            style={{ color: 'rgba(245,241,234,0.65)', borderColor: 'rgba(245,241,234,0.25)' }}
          >
            Pricing approach
          </Link>
        </div>
      </section>
    </main>
  );
}
