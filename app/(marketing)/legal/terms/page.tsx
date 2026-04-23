const INK = '#001030';
const TEAL = '#002060';
const CREAM = '#f5f1ea';
const GOLD = '#b8965a';

export default function TermsPage() {
  return (
    <main style={{ background: '#fdfcfa', color: INK }} className="font-sans">
      <section
        className="relative overflow-hidden px-6 pb-16 pt-36 md:px-14 md:pb-20 md:pt-44"
        style={{ background: TEAL }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div className="relative z-[1] mx-auto max-w-3xl">
          <div
            className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-8" style={{ background: GOLD }} />
            Legal
          </div>
          <h1
            className="font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[56px]"
            style={{ color: CREAM }}
          >
            Terms of Service
          </h1>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
            Last updated: 23 April 2026
          </p>
        </div>
      </section>

      <section className="px-6 py-20 md:px-14 md:py-24">
        <div className="mx-auto max-w-3xl space-y-6 text-[15px] leading-[1.8]" style={{ color: 'rgba(0,16,48,0.78)' }}>
          <div
            className="border-l-2 p-6"
            style={{ borderColor: GOLD, background: CREAM }}
          >
            <p className="m-0">
              <strong>These terms are under review by our legal counsel.</strong> The current operational
              version is available on request — contact{' '}
              <a href="mailto:hello@regalis.co.za" className="underline" style={{ color: TEAL }}>
                hello@regalis.co.za
              </a>{' '}
              and we will share it directly.
            </p>
          </div>

          <p>
            By using Regalis you agree to operate within the law of the Republic of South Africa,
            including the Rental Housing Act, the Estate Agency Affairs Act, and POPIA. Regalis
            provides the software and infrastructure; the trust accounts, mandates, and underlying
            obligations remain yours as the operator.
          </p>
          <p>
            All plans are month-to-month unless otherwise agreed in writing. You may cancel at any
            time and export your data. We will provide reasonable assistance with migration both in
            and out of the platform.
          </p>
        </div>
      </section>
    </main>
  );
}
