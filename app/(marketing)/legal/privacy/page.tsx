import { MARKETING_THEME as T } from '@/lib/marketing-theme';

export default function PrivacyPage() {
  return (
    <main style={{ background: T.creamSoft, color: T.ink }} className="font-sans">
      <section
        className="relative overflow-hidden px-6 pb-16 pt-36 md:px-14 md:pb-20 md:pt-44"
        style={{ background: `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div className="relative z-[1] mx-auto max-w-3xl">
          <div
            className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-8" style={{ background: T.gold }} />
            Legal
          </div>
          <h1
            className="font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[56px]"
            style={{ color: T.cream }}
          >
            Privacy Policy
          </h1>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: T.gold }}>
            Last updated: 23 April 2026
          </p>
        </div>
      </section>

      <section className="px-6 py-20 md:px-14 md:py-24">
        <div className="mx-auto max-w-3xl space-y-6 text-[15px] leading-[1.8]" style={{ color: T.textSoft }}>
          <div className="border-l-2 p-6" style={{ borderColor: T.gold, background: T.cream }}>
            <p className="m-0">
              <strong>This policy is under review by our legal counsel.</strong> The current operational
              version is available on request â€” contact{' '}
              <a href="mailto:hello@regalis.co.za" className="underline" style={{ color: T.inkSoft }}>
                hello@regalis.co.za
              </a>{' '}
              and we will share it directly.
            </p>
          </div>

          <p>
            Regalis is committed to processing personal information in accordance with the Protection
            of Personal Information Act (POPIA, Act 4 of 2013) and applicable South African law. We
            collect only the information needed to operate the platform on your behalf, and we never
            sell user data.
          </p>
          <p>
            For data subject access requests, deletion requests, or POPIA-related queries, please
            contact us at the address above. The full policy will be published here once finalised.
          </p>
        </div>
      </section>
    </main>
  );
}
