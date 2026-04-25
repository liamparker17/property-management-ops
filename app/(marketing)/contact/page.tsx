import { Mail, MapPin, Clock, MessageSquare, Briefcase, LifeBuoy } from 'lucide-react';

import { ContactForm } from '@/components/marketing/contact-form';
import { MarketingJourneyGrid } from '@/components/marketing/marketing-journey-grid';
import { MARKETING_THEME as T } from '@/lib/marketing-theme';

const CONTACT_PATHS = [
  {
    href: '/product#tenant-onboarding',
    label: 'Before contact',
    title: 'Review the rollout path',
    desc: 'If you still need product context, start with onboarding, lease control, and the tenant service layer.',
  },
  {
    href: '/pricing#faq',
    label: 'Commercials',
    title: 'Read the pricing conversation first',
    desc: 'The pricing page answers the common questions before you decide to write in.',
  },
  {
    href: '#message',
    label: 'Direct route',
    title: 'Write to the team now',
    desc: 'If you already know enough, skip the rest of the site and move straight into outreach.',
  },
];

export default function ContactPage() {
  return (
    <main style={{ background: T.creamSoft, color: T.ink }} className="font-sans">
      <section
        className="relative overflow-hidden px-6 pb-20 pt-36 md:px-14 md:pb-24 md:pt-48"
        style={{ background: `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div className="relative z-[1] mx-auto max-w-3xl">
          <div
            className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: T.gold }}
          >
            <span className="block h-px w-8" style={{ background: T.gold }} />
            Contact
          </div>
          <h1
            className="font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[72px]"
            style={{ color: T.cream }}
          >
            Contact <em style={{ color: T.goldSoft }}>Regalis.</em>
          </h1>
          <p className="mt-6 max-w-xl text-[14px] leading-[1.75]" style={{ color: T.textOnDark }}>
            Sales, support, partnerships, or implementation questions. Write to us and we&apos;ll
            respond within one business day.
          </p>
        </div>
      </section>

      <MarketingJourneyGrid
        eyebrow="Choose the shortest path"
        title="You should not have to guess where to go next."
        description="If you are not ready to send a message yet, these links will take you to the smallest useful next read."
        items={CONTACT_PATHS}
      />

      <section data-reveal id="ways-to-reach-us" className="px-6 py-20 md:px-14 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2 md:gap-20">
          <div>
            <div
              className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: T.gold }}
            >
              <span className="block h-px w-6" style={{ background: T.gold }} />
              How to reach us
            </div>
            <h2
              className="mb-10 font-serif text-[28px] font-light leading-[1.15] tracking-[-0.01em] sm:text-[36px]"
              style={{ color: T.ink }}
            >
              Every message reaches someone who can respond directly.
            </h2>

            <ul className="space-y-7">
              <li className="flex gap-4">
                <Mail size={22} className="flex-shrink-0" color={T.inkSoft} strokeWidth={1.5} />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                    Email
                  </div>
                  <a
                    href="mailto:hello@regalis.co.za"
                    className="mt-1 block text-[15px] no-underline"
                    style={{ color: T.ink }}
                  >
                    hello@regalis.co.za
                  </a>
                </div>
              </li>
              <li className="flex gap-4">
                <MapPin size={22} className="flex-shrink-0" color={T.inkSoft} strokeWidth={1.5} />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                    Office
                  </div>
                  <div className="mt-1 text-[15px] leading-[1.5]" style={{ color: T.ink }}>
                    Johannesburg, South Africa
                    <br />
                    <span className="text-[13px]" style={{ color: T.textSoft }}>
                      By appointment only
                    </span>
                  </div>
                </div>
              </li>
              <li className="flex gap-4">
                <Clock size={22} className="flex-shrink-0" color={T.inkSoft} strokeWidth={1.5} />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: T.gold }}>
                    Hours
                  </div>
                  <div className="mt-1 text-[15px] leading-[1.5]" style={{ color: T.ink }}>
                    Mon-Fri | 08:00-17:00 SAST
                  </div>
                </div>
              </li>
            </ul>

            <div className="mt-12 border-t pt-8" style={{ borderColor: T.border }}>
              <div
                className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: T.gold }}
              >
                Good reasons to reach out
              </div>
              <div className="space-y-4">
                {CONTACT_REASONS.map((reason) => (
                  <div key={reason.title} className="flex gap-4">
                    <reason.Icon size={20} className="mt-1 flex-shrink-0" color={T.inkSoft} strokeWidth={1.5} />
                    <div>
                      <div className="text-[14px] font-medium" style={{ color: T.ink }}>
                        {reason.title}
                      </div>
                      <p className="text-[13px] leading-[1.6]" style={{ color: T.textSoft }}>
                        {reason.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div id="message" className="border p-8 md:p-10" style={{ borderColor: T.borderStrong, background: T.cream }}>
            <div
              className="mb-6 font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: T.gold }}
            >
              Send a message
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}

const CONTACT_REASONS = [
  {
    title: 'Sales and fit',
    desc: 'You want to assess whether Regalis suits your current portfolio and operating model.',
    Icon: Briefcase,
  },
  {
    title: 'Rollout questions',
    desc: 'You want to discuss onboarding, data setup, or which workflow should be implemented first.',
    Icon: MessageSquare,
  },
  {
    title: 'Support',
    desc: 'You already use the platform and need help from someone who can respond directly.',
    Icon: LifeBuoy,
  },
];
