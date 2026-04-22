import Link from 'next/link';

const INK = '#001030';
const TEAL = '#002060';
const CREAM = '#f5f1ea';
const CREAM_D = '#ede8df';
const GOLD = '#b8965a';
const GOLD_LT = '#d4b07a';

export default function LandingPage() {
  return (
    <main style={{ background: '#fdfcfa', color: INK }} className="font-sans">
      {/* ── NAV ── */}
      <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 backdrop-blur-md md:px-14" style={{ background: 'rgba(253,252,250,0.92)', boxShadow: `0 1px 0 ${INK}1f` }}>
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span className="inline-flex overflow-hidden rounded-sm">
            <img src="/regalis.svg" alt="Regalis" className="h-9 w-auto object-contain" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[20px] font-normal uppercase tracking-[0.08em]" style={{ color: INK }}>Regalis</span>
            <span className="mt-[2px] font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Property Ops</span>
          </span>
        </Link>
        <div className="flex items-center gap-6 md:gap-9">
          <Link href="#features" className="hidden text-[12px] font-medium uppercase tracking-[0.12em] no-underline sm:inline" style={{ color: INK }}>Features</Link>
          <Link href="/login" className="relative inline-block overflow-hidden px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] no-underline transition" style={{ background: INK, color: '#fdfcfa' }}>
            <span className="relative z-[1]">Sign in →</span>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        <div className="relative flex flex-col justify-end overflow-hidden px-8 pb-16 pt-32 md:px-16 md:pb-20 md:pt-[120px]" style={{ background: TEAL }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-8 select-none font-serif text-[300px] font-light leading-none md:text-[420px]" style={{ color: 'rgba(184,150,90,0.07)' }}>R</div>

          <div className="relative z-[1] mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            <span className="block h-px w-8" style={{ background: GOLD }} />
            Built for South African rentals
          </div>
          <h1 className="relative z-[1] mb-9 font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[78px]" style={{ color: CREAM }}>
            Property management,<br />
            <em className="not-italic" style={{ fontStyle: 'italic', color: GOLD_LT }}>without the<br />spreadsheets.</em>
          </h1>
          <p className="relative z-[1] mb-12 max-w-sm text-[14px] leading-[1.75]" style={{ color: 'rgba(245,241,234,0.65)' }}>
            Manage your portfolio, tenants, and leases in one place. Track occupancy, renewals, and documents with clarity.
          </p>
          <div className="relative z-[1] flex flex-wrap items-center gap-7">
            <Link href="/login" className="relative inline-block overflow-hidden px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] no-underline" style={{ background: INK, color: '#fdfcfa' }}>
              Sign in to your workspace
            </Link>
            <Link href="#features" className="group text-[12px] font-medium uppercase tracking-[0.12em] no-underline transition" style={{ color: 'rgba(245,241,234,0.55)' }}>
              See what&apos;s inside <span className="ml-1 inline-block transition group-hover:translate-x-1">↓</span>
            </Link>
          </div>
        </div>

        <div className="relative flex flex-col justify-center px-8 py-20 md:px-16 md:py-[140px]" style={{ background: CREAM }}>
          <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${GOLD}, ${TEAL})` }} />
          <div className="grid gap-0 py-10">
            <Stat num={<>8<sup style={{ color: GOLD }}>+</sup></>} label="Core modules" desc="Properties, tenants, leases, maintenance, and more." />
            <Stat num={<>&lt;5</>} label="Min onboarding" desc="Finish setup in under five minutes, not five days." />
            <Stat num="0" label="Spreadsheets needed" desc="One workspace. Every property. Every tenant. Every move." last />
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="flex overflow-hidden py-3.5" style={{ background: INK }}>
        <div className="flex animate-ticker whitespace-nowrap">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-10 px-10 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(245,241,234,0.45)' }}>
              {t}
              <span className="inline-block h-1 w-1 flex-shrink-0 rounded-full" style={{ background: GOLD }} />
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className="px-6 py-24 md:px-14 md:py-[120px]" style={{ background: '#fdfcfa' }}>
        <div className="mb-16 grid items-end gap-12 md:grid-cols-2 md:mb-20">
          <div>
            <div className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>
              <span className="block h-px w-6" style={{ background: GOLD }} />
              Everything you need
            </div>
            <h2 className="font-serif text-[36px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[48px] md:text-[58px]" style={{ color: INK }}>
              One workspace,<br />
              <em style={{ color: TEAL }}>every move.</em>
            </h2>
          </div>
          <p className="max-w-md self-end text-[14px] leading-[1.8]" style={{ color: 'rgba(0,16,48,0.55)' }}>
            Eight tightly-integrated modules designed around the reality of South African rental management — not retrofitted from US or UK software.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ border: `1px solid ${INK}1f` }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className="feature-card group relative overflow-hidden p-9 transition hover:bg-[#f5f1ea]" style={{ borderRight: `1px solid ${INK}1f`, borderBottom: `1px solid ${INK}1f` }}>
              <span aria-hidden className="absolute bottom-0 left-0 right-full h-0.5 transition-all duration-500 group-hover:right-0" style={{ background: GOLD }} />
              <span className="mb-6 block font-mono text-[10px] tracking-[0.15em]" style={{ color: GOLD }}>{String(i + 1).padStart(2, '0')}</span>
              <div className="mb-5 h-8 w-8 opacity-70">{f.icon}</div>
              <h3 className="mb-3 text-[15px] font-semibold tracking-[0.02em]" style={{ color: INK }}>{f.title}</h3>
              <p className="text-[13px] leading-[1.7]" style={{ color: 'rgba(0,16,48,0.55)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SA STRIP ── */}
      <div className="flex items-center gap-6 border-y px-6 py-5 md:px-14" style={{ background: CREAM_D, borderColor: `${INK}1f` }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="flex-shrink-0 opacity-50">
          <circle cx="12" cy="12" r="10" stroke={INK} strokeWidth="1.5" />
          <path d="M12 2C12 2 8 7 8 12s4 10 4 10M12 2c0 0 4 5 4 10s-4 10-4 10M2 12h20" stroke={INK} strokeWidth="1.5" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(0,16,48,0.55)' }}>
          <strong style={{ color: INK }}>Proudly South African</strong> — built for the Rental Housing Act, FICA requirements, and local rental norms.
        </span>
      </div>

      {/* ── MANIFESTO ── */}
      <section className="relative overflow-hidden px-6 py-20 md:grid md:grid-cols-2 md:gap-20 md:px-14 md:py-[100px]" style={{ background: TEAL }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-hatch" />
        <div className="relative z-[1] mb-12 md:mb-0">
          <p className="font-serif text-[28px] font-light leading-[1.2] tracking-[-0.01em] sm:text-[38px] md:text-[52px]" style={{ color: CREAM }}>
            Rental management should feel<br />
            like clarity, not <em style={{ color: GOLD_LT }}>chaos.</em>
          </p>
        </div>
        <div className="relative z-[1]">
          {MANIFESTO.map((m, i, arr) => (
            <div key={i} className="flex items-start gap-5 py-5" style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid rgba(184,150,90,0.2)' }}>
              <span className="flex-shrink-0 pt-1 font-mono text-[10px] tracking-[0.1em]" style={{ color: GOLD }}>{String(i + 1).padStart(2, '0')}</span>
              <p className="text-[14px] leading-[1.6]" style={{ color: 'rgba(245,241,234,0.7)' }} dangerouslySetInnerHTML={{ __html: m }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden px-6 py-28 text-center md:px-14 md:py-[140px]" style={{ background: INK }}>
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-serif text-[22vw] font-light tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.025)' }}>REGALIS</div>
        <div className="relative z-[1] mb-7 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: GOLD }}>
          <span className="block h-px w-8" style={{ background: GOLD }} />
          Get started
          <span className="block h-px w-8" style={{ background: GOLD }} />
        </div>
        <h2 className="relative z-[1] mb-5 font-serif text-[40px] font-light leading-[1.1] tracking-[-0.01em] sm:text-[56px] md:text-[72px]" style={{ color: CREAM }}>
          Your portfolio,<br />
          <em style={{ color: GOLD_LT }}>finally organised.</em>
        </h2>
        <p className="relative z-[1] mb-13 text-[14px] tracking-[0.02em]" style={{ color: 'rgba(245,241,234,0.5)' }}>
          Existing tenants and staff only. No credit card required.
        </p>
        <div className="relative z-[1] mt-10 flex flex-wrap items-center justify-center gap-6">
          <Link href="/login" className="inline-block px-10 py-4 text-[12px] font-bold uppercase tracking-[0.14em] no-underline transition hover:brightness-110" style={{ background: GOLD, color: INK }}>
            Sign in to workspace
          </Link>
          <Link href="/login" className="inline-block border px-8 py-[15px] text-[12px] font-medium uppercase tracking-[0.14em] no-underline transition hover:border-[color:var(--gold)]" style={{ color: 'rgba(245,241,234,0.6)', borderColor: 'rgba(245,241,234,0.2)' }}>
            Learn more
          </Link>
        </div>
        <p className="relative z-[1] mt-5 font-mono text-[10px] tracking-[0.15em]" style={{ color: 'rgba(245,241,234,0.3)' }}>
          © {new Date().getFullYear()} Regalis · Built for South African rental properties
        </p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="flex flex-col items-center justify-between gap-3 border-t px-6 py-10 md:flex-row md:px-14" style={{ background: INK, borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="font-serif text-[18px] uppercase tracking-[0.1em]" style={{ color: 'rgba(245,241,234,0.4)' }}>Regalis</span>
        <span className="font-mono text-[10px] tracking-[0.15em]" style={{ color: 'rgba(245,241,234,0.25)' }}>
          © {new Date().getFullYear()} · Property Ops Platform · South Africa
        </span>
      </footer>
    </main>
  );
}

function Stat({ num, label, desc, last }: { num: React.ReactNode; label: string; desc: string; last?: boolean }) {
  return (
    <div className="flex flex-col justify-center py-9" style={{ borderBottom: last ? 'none' : '1px solid rgba(0,32,96,0.12)' }}>
      <span className="font-serif text-[52px] font-light leading-none tracking-[-0.02em] sm:text-[72px] md:text-[88px]" style={{ color: INK }}>{num}</span>
      <span className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgba(0,16,48,0.55)' }}>{label}</span>
      <span className="mt-1 text-[13px] leading-[1.5]" style={{ color: 'rgba(0,16,48,0.55)' }}>{desc}</span>
    </div>
  );
}

const TICKER = [
  'Lease management',
  'Tenant portal',
  'Occupancy tracking',
  'SA rental compliance',
  'Maintenance routing',
  'Document management',
  'Portfolio overview',
  'Duplicate detection',
];

const MANIFESTO = [
  '<strong style="color:#f5f1ea;font-weight:600">No more shared spreadsheets</strong> with version conflicts and permission headaches.',
  '<strong style="color:#f5f1ea;font-weight:600">No more inbox chasing</strong> for maintenance updates, signed leases, or payment confirmations.',
  '<strong style="color:#f5f1ea;font-weight:600">No more generic software</strong> that doesn&apos;t understand South African rental law or practice.',
  'Just <strong style="color:#f5f1ea;font-weight:600">one clean workspace</strong> that handles the complexity so you don&apos;t have to.',
];

const FEATURES = [
  {
    title: 'Properties',
    desc: 'Track every property, unit, and address with full history and document trails.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="4" y="10" width="24" height="18" rx="1" stroke={TEAL} strokeWidth="1.5" />
        <path d="M10 10V7a6 6 0 0112 0v3" stroke={TEAL} strokeWidth="1.5" />
        <rect x="13" y="18" width="6" height="6" rx="0.5" stroke={GOLD} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Tenants',
    desc: 'Central tenant records with duplicate detection — one source of truth.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <circle cx="16" cy="12" r="5" stroke={TEAL} strokeWidth="1.5" />
        <path d="M6 26c0-5.5 4.5-8 10-8s10 2.5 10 8" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M22 8l2 2-2 2" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Leases',
    desc: 'Draft, activate, renew, and terminate with state safety. No broken workflows.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="5" y="5" width="22" height="22" rx="1" stroke={TEAL} strokeWidth="1.5" />
        <path d="M5 12h22M12 5v22" stroke={TEAL} strokeWidth="1.5" />
        <path d="M16 16l4 4-4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Maintenance',
    desc: 'Tenant requests routed to the right person, every time. Nothing falls through.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <path d="M6 26V10l10-6 10 6v16" stroke={TEAL} strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="12" y="16" width="8" height="10" stroke={GOLD} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Occupancy',
    desc: "Know what's vacant, upcoming, or conflicting at a glance.",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <circle cx="16" cy="16" r="11" stroke={TEAL} strokeWidth="1.5" />
        <path d="M16 9v7l4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Compliance',
    desc: 'South African rental defaults baked in. Less to remember, fewer mistakes.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <path d="M8 6h16v20H8z" stroke={TEAL} strokeWidth="1.5" />
        <path d="M11 11h10M11 15h10M11 19h6" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Tenant portal',
    desc: 'Tenants sign leases, log repairs, and pay — without email tag.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <rect x="5" y="8" width="22" height="16" rx="2" stroke={TEAL} strokeWidth="1.5" />
        <path d="M5 13h22" stroke={TEAL} strokeWidth="1.5" />
        <circle cx="10" cy="19" r="2" stroke={GOLD} strokeWidth="1.5" />
        <path d="M15 19h7" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Built for speed',
    desc: 'Finish onboarding in under five minutes, not five days.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
        <path d="M6 22L12 10l6 8 4-5 4 9H6z" stroke={TEAL} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M26 8l-3 3-3-3" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];
