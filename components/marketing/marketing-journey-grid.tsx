import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { MARKETING_THEME as T } from '@/lib/marketing-theme';

type JourneyItem = {
  href: string;
  label: string;
  title: string;
  desc: string;
};

export function MarketingJourneyGrid({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  items: JourneyItem[];
}) {
  return (
    <section className="px-6 py-16 md:px-14 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div>
            <div
              className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: T.gold }}
            >
              <span className="block h-px w-6" style={{ background: T.gold }} />
              {eyebrow}
            </div>
            <h2
              className="font-serif text-[30px] font-light leading-[1.12] tracking-[-0.01em] sm:text-[40px]"
              style={{ color: T.ink }}
            >
              {title}
            </h2>
          </div>
          {description ? (
            <p className="max-w-md justify-self-start text-[14px] leading-[1.75] md:justify-self-end" style={{ color: T.textSoft }}>
              {description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <Link
              key={`${item.href}-${item.title}`}
              href={item.href}
              className="group lift relative block border p-6 no-underline hover:shadow-[0_24px_48px_-24px_rgba(0,16,48,0.22)]"
              style={{ borderColor: T.borderStrong, background: T.cream }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
                style={{ background: T.gold }}
              />
              <div
                className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors duration-300"
                style={{ color: T.gold }}
              >
                {item.label}
              </div>
              <h3 className="font-serif text-[24px] font-light leading-[1.15]" style={{ color: T.ink }}>
                {item.title}
              </h3>
              <p className="mt-3 text-[13px] leading-[1.7]" style={{ color: T.textSoft }}>
                {item.desc}
              </p>
              <span
                className="mt-6 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em]"
                style={{ color: T.inkSoft }}
              >
                Take a look
                <ArrowRight size={14} className="cta-arrow" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
