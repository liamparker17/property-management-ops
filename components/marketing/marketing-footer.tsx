import Link from 'next/link';

const INK = '#001030';
const CREAM = '#f5f1ea';
const GOLD = '#b8965a';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { href: '/product#portfolio-structure', label: 'Portfolio structure' },
      { href: '/product#tenant-onboarding', label: 'Onboarding path' },
      { href: '/product#tenant-service', label: 'Tenant service layer' },
      { href: '/pricing#who-its-for', label: 'Pricing profiles' },
    ],
  },
  {
    title: 'Read Next',
    links: [
      { href: '/pricing#how-pricing-is-scoped', label: 'How pricing is scoped' },
      { href: '/about#why-we-built-it', label: 'Why Regalis exists' },
      { href: '/about#principles', label: 'Operating principles' },
      { href: '/about#team', label: 'The team' },
    ],
  },
  {
    title: 'Start',
    links: [
      { href: '/contact#message', label: 'Write to the team' },
      { href: '/contact#ways-to-reach-us', label: 'Contact details' },
      { href: '/signup', label: 'Request access' },
      { href: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/privacy', label: 'Privacy policy' },
      { href: '/legal/terms', label: 'Terms of service' },
    ],
  },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative" style={{ background: INK, color: CREAM }}>
      <div className="px-6 pb-14 pt-20 md:px-14 md:pb-16 md:pt-24">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5 no-underline">
              <span className="inline-flex overflow-hidden rounded-sm bg-white">
                <img src="/regalis.svg" alt="Regalis" className="h-9 w-9 object-contain" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-serif text-[20px] font-normal uppercase tracking-[0.08em]" style={{ color: CREAM }}>
                  Regalis
                </span>
                <span
                  className="mt-[2px] font-mono text-[9px] uppercase tracking-[0.2em]"
                  style={{
                    color: GOLD,
                    WebkitTextStroke: `0.5px ${CREAM}`,
                  }}
                >
                  Property Ops
                </span>
              </span>
            </Link>
            <p className="mt-6 max-w-xs text-[13px] leading-[1.7]" style={{ color: 'rgba(245,241,234,0.55)' }}>
              A South African property operations workspace for applications, leases, tenant communication,
              repairs, and rent administration.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div
                className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: GOLD }}
              >
                {col.title}
              </div>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-[13px] no-underline transition hover:text-white"
                      style={{ color: 'rgba(245,241,234,0.65)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-14 flex flex-col items-start justify-between gap-4 border-t pt-8 md:flex-row md:items-center"
          style={{ borderColor: 'rgba(245,241,234,0.1)' }}
        >
          <span className="font-serif text-[16px] uppercase tracking-[0.1em]" style={{ color: 'rgba(245,241,234,0.45)' }}>
            Regalis
          </span>
          <span className="font-mono text-[10px] tracking-[0.15em]" style={{ color: 'rgba(245,241,234,0.3)' }}>
            Â© {year} Â· Property Ops Platform Â· South Africa
          </span>
        </div>
      </div>
    </footer>
  );
}
