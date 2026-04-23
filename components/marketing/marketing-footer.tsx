import Link from 'next/link';

const INK = '#001030';
const CREAM = '#f5f1ea';
const GOLD = '#b8965a';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Product',
      links: [
        { href: '/product', label: 'Overview' },
        { href: '/pricing', label: 'Pricing' },
        { href: '/contact', label: 'Book a walkthrough' },
        { href: '/login', label: 'Sign in' },
      ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/contact', label: 'Contact' },
      { href: '/contact', label: 'Partnerships' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/product', label: 'Features' },
      { href: '/pricing#faq', label: 'FAQ' },
      { href: '/contact', label: 'Support' },
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
                <img src="/regalis.svg" alt="Regalis" className="h-9 w-auto object-contain" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-serif text-[20px] font-normal uppercase tracking-[0.08em]" style={{ color: CREAM }}>
                  Regalis
                </span>
                <span className="mt-[2px] font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>
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
            © {year} · Property Ops Platform · South Africa
          </span>
        </div>
      </div>
    </footer>
  );
}
