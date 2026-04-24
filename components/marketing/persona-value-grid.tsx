'use client';

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  BadgeDollarSign,
  Building2,
  ClipboardList,
  FileText,
  KeyRound,
  LayoutDashboard,
  MessageSquareMore,
  ReceiptText,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';

import { MARKETING_THEME as T } from '@/lib/marketing-theme';

type Feature = {
  title: string;
  body: string;
  Icon: LucideIcon;
};

type Persona = {
  id: string;
  prompt: string;
  label: string;
  summary: string;
  Icon: LucideIcon;
  features: Feature[];
};

const PERSONAS: Persona[] = [
  {
    id: 'property-manager',
    prompt: 'Are you a property manager?',
    label: 'Property Manager',
    summary: 'Consolidate leasing, tenant administration, invoicing, and maintenance into one controlled operating layer.',
    Icon: LayoutDashboard,
    features: [
      {
        title: 'Keep application decisions inside the record',
        body: 'Reviewers, notes, supporting documents, and final decisions remain attached to one application flow instead of being dispersed across inboxes and side channels.',
        Icon: ClipboardList,
      },
      {
        title: 'Move from approval into onboarding cleanly',
        body: 'Approved applications can progress into tenant setup, unit assignment, and draft lease preparation without rebuilding the same information twice.',
        Icon: Users,
      },
      {
        title: 'Maintain lease administration with continuity',
        body: 'Drafts, renewals, signatures, documents, and review requests remain connected to the lease history the team needs to retain.',
        Icon: FileText,
      },
      {
        title: 'Retain visibility over operational exposure',
        body: 'Track expiries, overdue invoices, maintenance status, and portfolio follow-up from one place before issues become escalation points.',
        Icon: BadgeDollarSign,
      },
    ],
  },
  {
    id: 'landlord',
    prompt: 'Are you a landlord?',
    label: 'Landlord',
    summary: 'Introduce structure and traceability without relying on informal tools and memory.',
    Icon: Building2,
    features: [
      {
        title: 'Hold the portfolio in one view',
        body: 'See which tenant occupies each unit, which lease is active, and which documents belong to the property without working through separate folders.',
        Icon: Building2,
      },
      {
        title: 'Retain control over rent and lease administration',
        body: 'Track invoice history, lease dates, and routine tenant administration without relying on memory or scattered notes.',
        Icon: ReceiptText,
      },
      {
        title: 'Provide tenants with a proper service channel',
        body: 'Tenants can retrieve documents, raise repairs, and review invoice history without calling or messaging for routine administrative matters.',
        Icon: MessageSquareMore,
      },
      {
        title: 'Reduce unresolved administrative exposure',
        body: 'A more disciplined operating record leaves fewer missed follow-ups, fewer duplicated actions, and less month-end uncertainty.',
        Icon: ShieldCheck,
      },
    ],
  },
  {
    id: 'principal-agent',
    prompt: 'Are you a principal agent?',
    label: 'Principal Agent',
    summary: 'Introduce oversight, traceability, and process discipline across the team.',
    Icon: ShieldCheck,
    features: [
      {
        title: 'Establish one operating record for the team',
        body: 'Applications, tenants, leases, invoices, and maintenance remain inside shared records rather than private working notes and informal updates.',
        Icon: LayoutDashboard,
      },
      {
        title: 'Reduce fragility in internal handoff',
        body: 'When responsibility moves between admin, leasing, and support, the record moves with it instead of relying on verbal context and individual recall.',
        Icon: Users,
      },
      {
        title: 'Identify where process is stalling',
        body: 'Spot missing documents, overdue invoices, unresolved repairs, and approaching lease deadlines before they mature into escalation.',
        Icon: ClipboardList,
      },
      {
        title: 'Strengthen auditability across the operation',
        body: 'A cleaner service trail makes it easier to establish what happened, who acted, and what still requires attention.',
        Icon: ShieldCheck,
      },
    ],
  },
  {
    id: 'tenant',
    prompt: 'Are you a tenant?',
    label: 'Tenant',
    summary: 'Access a more orderly service experience than routing every request through the office.',
    Icon: KeyRound,
    features: [
      {
        title: 'Access lease information directly',
        body: 'View lease information, related documents, and current rental administration from one place without requesting it manually.',
        Icon: FileText,
      },
      {
        title: 'Submit repairs through a defined process',
        body: 'Maintenance requests can be raised with context and retained in visible history instead of disappearing into ad hoc communication.',
        Icon: Wrench,
      },
      {
        title: 'Review invoices and account history directly',
        body: 'See what has been billed and what remains outstanding without waiting for office follow-up.',
        Icon: ReceiptText,
      },
      {
        title: 'Reduce routine administrative friction',
        body: 'The portal reduces avoidable calls, messages, and document requests by placing routine account access in one controlled interface.',
        Icon: MessageSquareMore,
      },
    ],
  },
];

export function PersonaValueGrid() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const orderedPersonas = useMemo(() => {
    if (!selectedId) return PERSONAS;

    const active = PERSONAS.find((persona) => persona.id === selectedId);
    const rest = PERSONAS.filter((persona) => persona.id !== selectedId);
    return active ? [active, ...rest] : PERSONAS;
  }, [selectedId]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {orderedPersonas.map((persona, index) => {
        const active = persona.id === selectedId;
        return (
          <article
            key={persona.id}
            className={`group relative overflow-hidden border transition-all duration-500 ease-out ${
              active ? 'md:col-span-2 xl:col-span-4' : ''
            }`}
            style={{
              borderColor: active ? T.gold : T.borderStrong,
              background: active ? `linear-gradient(180deg, ${T.inkDeep}, ${T.ink})` : T.creamSoft,
              boxShadow: active ? '0 24px 72px rgba(0,16,48,0.18)' : 'none',
              transform: active ? 'translateY(-3px)' : 'translateY(0)',
            }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5"
              style={{ background: active ? T.gold : 'transparent' }}
            />

            <button
              type="button"
              onClick={() => setSelectedId((current) => (current === persona.id ? null : persona.id))}
              aria-expanded={active}
              className="w-full px-6 py-7 text-left md:px-7 md:py-8"
            >
              <div className="mb-10 flex items-start justify-between gap-4">
                <persona.Icon
                  size={26}
                  strokeWidth={1.6}
                  color={active ? T.goldSoft : T.inkSoft}
                />
                <ArrowUpRight
                  size={18}
                  strokeWidth={1.6}
                  color={active ? T.goldSoft : T.textMuted}
                  className={`transition duration-300 ${
                    active ? 'rotate-45' : 'group-hover:-translate-y-0.5 group-hover:translate-x-0.5'
                  }`}
                />
              </div>

              <div
                className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em]"
                style={{ color: active ? T.goldSoft : T.textMuted }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-end">
                <h3
                  className="max-w-xl font-serif text-[24px] font-light leading-[1.12] md:text-[28px]"
                  style={{ color: active ? T.cream : T.ink }}
                >
                  {persona.prompt}
                </h3>
                <p
                  className="max-w-md text-[13px] leading-[1.7] md:justify-self-end"
                  style={{ color: active ? T.textOnDark : T.textSoft }}
                >
                  {persona.summary}
                </p>
              </div>
            </button>

            <div
              className="overflow-hidden transition-all duration-500 ease-out"
              style={{
                maxHeight: active ? '900px' : '0px',
                opacity: active ? 1 : 0,
              }}
            >
              <div
                className="border-t px-6 pb-6 pt-6 md:px-7 md:pb-7 md:pt-7"
                style={{ borderColor: T.borderStrong, background: T.cream }}
              >
                <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div
                      className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em]"
                      style={{ color: T.gold }}
                    >
                      Four reasons this matters
                    </div>
                    <h4
                      className="font-serif text-[30px] font-light leading-[1.08] tracking-[-0.01em] md:text-[38px]"
                      style={{ color: T.ink }}
                    >
                      Direct value for {persona.label.toLowerCase()}s.
                    </h4>
                  </div>
                  <p className="max-w-xl text-[14px] leading-[1.75]" style={{ color: T.textSoft }}>
                    These value points stay close to workflows already present in the product, keeping the page specific without drifting into future-state claims.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {persona.features.map((feature, featureIndex) => (
                    <div
                      key={feature.title}
                      className="border px-5 py-5 transition-all duration-500 ease-out"
                      style={{
                        borderColor: T.borderStrong,
                        background: T.creamSoft,
                        transform: active ? 'translateY(0)' : 'translateY(8px)',
                        transitionDelay: `${featureIndex * 70}ms`,
                      }}
                    >
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <feature.Icon size={22} strokeWidth={1.6} color={T.inkSoft} />
                        <span
                          className="font-mono text-[10px] uppercase tracking-[0.2em]"
                          style={{ color: T.gold }}
                        >
                          {String(featureIndex + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <h5
                        className="font-serif text-[22px] font-light leading-[1.2]"
                        style={{ color: T.ink }}
                      >
                        {feature.title}
                      </h5>
                      <p className="mt-3 text-[13px] leading-[1.75]" style={{ color: T.textSoft }}>
                        {feature.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
