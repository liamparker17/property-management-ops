import { Mail, MapPin, Clock, MessageSquare, Briefcase, LifeBuoy } from 'lucide-react';

import { ContactForm } from '@/components/marketing/contact-form';

const INK = '#001030';
const TEAL = '#002060';
const CREAM = '#f5f1ea';
const GOLD = '#b8965a';
const GOLD_LT = '#d4b07a';

export default function ContactPage() {
  return (
    <main style={{ background: '#fdfcfa', color: INK }} className="font-sans">
      {/* HERO */}
      <section
        className="relative overflow-hidden px-6 pb-20 pt-36 md:px-14 md:pb-24 md:pt-48"
        style={{ background: TEAL }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-architect-grid" />
        <div className="relative z-[1] mx-auto max-w-3xl">
          <div
            className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
            style={{ color: GOLD }}
          >
            <span className="block h-px w-8" style={{ background: GOLD }} />
            Contact
          </div>
          <h1
            className="font-serif text-[44px] font-light leading-[1.08] tracking-[-0.01em] sm:text-[60px] md:text-[72px]"
            style={{ color: CREAM }}
          >
            Let&apos;s have a <em style={{ color: GOLD_LT }}>conversation.</em>
          </h1>
          <p className="mt-6 max-w-xl text-[14px] leading-[1.75]" style={{ color: 'rgba(245,241,234,0.7)' }}>
            Sales, support, partnerships — write to us and a real human will respond within one
            business day.
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="px-6 py-20 md:px-14 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2 md:gap-20">
          {/* LEFT: how to reach us */}
          <div>
            <div
              className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: GOLD }}
            >
              <span className="block h-px w-6" style={{ background: GOLD }} />
              How to reach us
            </div>
            <h2
              className="mb-10 font-serif text-[28px] font-light leading-[1.15] tracking-[-0.01em] sm:text-[36px]"
              style={{ color: INK }}
            >
              We&apos;re a small team — every message lands with someone who can help.
            </h2>

            <ul className="space-y-7">
              <li className="flex gap-4">
                <Mail size={22} className="flex-shrink-0" color={TEAL} strokeWidth={1.5} />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                    Email
                  </div>
                  <a
                    href="mailto:hello@regalis.co.za"
                    className="mt-1 block text-[15px] no-underline"
                    style={{ color: INK }}
                  >
                    hello@regalis.co.za
                  </a>
                </div>
              </li>
              <li className="flex gap-4">
                <MapPin size={22} className="flex-shrink-0" color={TEAL} strokeWidth={1.5} />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                    Office
                  </div>
                  <div className="mt-1 text-[15px] leading-[1.5]" style={{ color: INK }}>
                    Cape Town, South Africa
                    <br />
                    <span className="text-[13px]" style={{ color: 'rgba(0,16,48,0.6)' }}>
                      By appointment only
                    </span>
                  </div>
                </div>
              </li>
              <li className="flex gap-4">
                <Clock size={22} className="flex-shrink-0" color={TEAL} strokeWidth={1.5} />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
                    Hours
                  </div>
                  <div className="mt-1 text-[15px] leading-[1.5]" style={{ color: INK }}>
                    Mon – Fri · 08:00 – 17:00 SAST
                  </div>
                </div>
              </li>
            </ul>

              <div className="mt-12 border-t pt-8" style={{ borderColor: `${INK}14` }}>
                <div
                  className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: GOLD }}
                >
                  Good reasons to reach out
                </div>
                <div className="space-y-4">
                  {CONTACT_REASONS.map((reason) => (
                    <div key={reason.title} className="flex gap-4">
                      <reason.Icon size={20} className="mt-1 flex-shrink-0" color={TEAL} strokeWidth={1.5} />
                      <div>
                        <div className="text-[14px] font-medium" style={{ color: INK }}>
                          {reason.title}
                        </div>
                        <p className="text-[13px] leading-[1.6]" style={{ color: 'rgba(0,16,48,0.62)' }}>
                          {reason.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          {/* RIGHT: form */}
          <div className="border p-8 md:p-10" style={{ borderColor: `${INK}1f`, background: CREAM }}>
            <div
              className="mb-6 font-mono text-[10px] uppercase tracking-[0.25em]"
              style={{ color: GOLD }}
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
    desc: 'You want to understand whether Regalis fits your current portfolio and operating model.',
    Icon: Briefcase,
  },
  {
    title: 'Rollout questions',
    desc: 'You want to talk through onboarding, data setup, or how to start with the right workflow first.',
    Icon: MessageSquare,
  },
  {
    title: 'Support',
    desc: 'You already use the platform and need help from someone who can actually respond.',
    Icon: LifeBuoy,
  },
];
