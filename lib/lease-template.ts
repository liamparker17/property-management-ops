import { formatZar, formatDate } from '@/lib/format';

export type LeaseTemplateData = {
  lessor: { name: string };
  property: {
    name: string;
    addressLine1: string;
    addressLine2?: string | null;
    suburb: string;
    city: string;
    postalCode: string;
    province: string;
  };
  unit: { label: string; bedrooms: number; bathrooms: number; sizeSqm?: number | null };
  tenants: Array<{ firstName: string; lastName: string; idNumber?: string | null; email?: string | null }>;
  startDate: Date;
  endDate: Date;
  rentAmountCents: number;
  depositAmountCents: number;
  paymentDueDay: number;
  heldInTrustAccount: boolean;
  notes?: string | null;
};

export type LeaseSection = {
  number: string;
  title: string;
  paragraphs: string[];
};

function fullAddress(p: LeaseTemplateData['property']): string {
  const parts = [p.addressLine1, p.addressLine2, p.suburb, p.city, p.postalCode, p.province].filter(
    (x): x is string => Boolean(x),
  );
  return parts.join(', ');
}

function tenantListText(tenants: LeaseTemplateData['tenants']): string {
  return tenants
    .map((t) => {
      const name = `${t.firstName} ${t.lastName}`.trim();
      return t.idNumber ? `${name} (ID ${t.idNumber})` : name;
    })
    .join(', ');
}

function monthsBetween(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(1, months);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function renderLeaseAgreement(data: LeaseTemplateData): LeaseSection[] {
  const tenantsText = tenantListText(data.tenants);
  const propertyAddress = fullAddress(data.property);
  const months = monthsBetween(data.startDate, data.endDate);
  const rent = formatZar(data.rentAmountCents);
  const deposit = formatZar(data.depositAmountCents);
  const start = formatDate(data.startDate);
  const end = formatDate(data.endDate);
  const dueDay = ordinal(data.paymentDueDay);

  const sections: LeaseSection[] = [
    {
      number: '1',
      title: 'Parties',
      paragraphs: [
        `This Residential Lease Agreement ("Agreement") is entered into between ${data.lessor.name} ("the Lessor") and ${tenantsText} ("the Tenant", whether one or more).`,
        `The parties agree that, where more than one Tenant is named, all Tenants shall be jointly and severally liable for all obligations under this Agreement.`,
      ],
    },
    {
      number: '2',
      title: 'Premises',
      paragraphs: [
        `The Lessor lets to the Tenant the residential premises known as ${data.property.name}, Unit ${data.unit.label}, situated at ${propertyAddress} ("the Premises").`,
        `The Premises comprise ${data.unit.bedrooms} bedroom(s) and ${data.unit.bathrooms} bathroom(s)${data.unit.sizeSqm ? `, with an approximate floor area of ${data.unit.sizeSqm} square metres` : ''}. The Premises are let for residential use by the Tenant and their immediate household only.`,
      ],
    },
    {
      number: '3',
      title: 'Duration',
      paragraphs: [
        `This lease commences on ${start} and terminates on ${end}, being a fixed term of approximately ${months} month(s).`,
        `Should the Tenant remain in occupation after the end date without a new fixed-term agreement being signed, the lease shall automatically convert to a month-to-month tenancy on the same terms, terminable by either party on one calendar month's written notice.`,
      ],
    },
    {
      number: '4',
      title: 'Rent and Payment',
      paragraphs: [
        `The monthly rent is ${rent}, payable in advance on or before the ${dueDay} day of each month.`,
        `Rent shall be paid by electronic funds transfer (EFT) into the bank account designated in writing by the Lessor. Cash payments will not be accepted unless agreed to in writing.`,
        `Any rent received after the due date shall attract interest at the prevailing prescribed legal rate, calculated from the due date until the date of actual payment. Persistent late payment may constitute a material breach of this Agreement.`,
      ],
    },
    {
      number: '5',
      title: 'Deposit',
      paragraphs: [
        `The Tenant shall pay a refundable security deposit of ${deposit} prior to taking occupation.`,
        data.heldInTrustAccount
          ? `The deposit will be held in an interest-bearing trust account as required by the Rental Housing Act 50 of 1999. Any interest accrued shall accrue to the Tenant and be paid out together with the deposit, less any lawful deductions.`
          : `The deposit will be held by the Lessor separately from operating funds. Any interest earned (if applicable) shall accrue to the Tenant.`,
        `On termination of the lease and vacating of the Premises, the Lessor shall refund the deposit (together with any accrued interest) within fourteen (14) days of restoration of the Premises to the Tenant, after deducting the reasonable cost of repairing any damage (fair wear and tear excluded) and any outstanding amounts owed under this Agreement.`,
        `A joint incoming and outgoing inspection of the Premises shall be conducted as provided for in the Rental Housing Act.`,
      ],
    },
    {
      number: '6',
      title: 'Utilities and Services',
      paragraphs: [
        `Unless otherwise agreed in writing, the Tenant is responsible for the cost of all utilities consumed at the Premises, including electricity, water, sewerage, refuse removal, and any telecommunications or internet services.`,
        `Where utilities are metered separately, the Tenant shall settle such accounts directly with the supplier. Where utilities are recovered by the Lessor, the Tenant shall pay the amount reflected on the monthly invoice within seven (7) days of receipt.`,
      ],
    },
    {
      number: '7',
      title: 'Maintenance and Repairs',
      paragraphs: [
        `The Tenant shall keep the interior of the Premises clean, sanitary, and in good order. The Tenant is responsible for minor repairs and replacements up to a value of R500 per incident, including items such as light bulbs, tap washers, and similar consumables.`,
        `The Lessor is responsible for structural repairs and for the maintenance of major systems including plumbing, electrical wiring, roofing, and geysers, provided that any damage caused by the Tenant's negligence or misuse shall be repaired at the Tenant's cost.`,
        `The Tenant shall report any maintenance issue in writing to the Lessor within a reasonable time of discovering it. Failure to report a defect that subsequently causes further damage may render the Tenant liable for that additional damage.`,
      ],
    },
    {
      number: '8',
      title: 'Use of the Premises',
      paragraphs: [
        `The Premises shall be used solely as a private residence for the Tenant and their immediate household. The Tenant shall not carry on any business from the Premises without the Lessor's prior written consent.`,
        `The Tenant shall not sublet or cede occupation of the Premises, in whole or in part, without the prior written consent of the Lessor, which shall not be unreasonably withheld.`,
        `The Tenant shall not cause or permit any nuisance, disturbance, or unlawful activity on the Premises and shall respect the quiet enjoyment of neighbouring occupiers.`,
      ],
    },
    {
      number: '9',
      title: 'Pets',
      paragraphs: [
        `No pets of any kind, including but not limited to dogs, cats, reptiles, or birds, are permitted on the Premises without prior written consent from the Lessor.`,
        `Where the Lessor grants written consent, such consent may be subject to conditions including an additional deposit, proof of vaccination, and rules regarding size, number, and behaviour of the animal. Any damage caused by a pet shall be repaired at the Tenant's cost.`,
      ],
    },
    {
      number: '10',
      title: 'Alterations',
      paragraphs: [
        `The Tenant shall not make any structural alterations, additions, or improvements to the Premises, nor install any fixtures or fittings that require drilling or permanent attachment, without the prior written consent of the Lessor.`,
        `Any approved alterations shall, at the end of the lease, either remain part of the Premises without compensation to the Tenant or be removed by the Tenant and the Premises restored to their original condition, as the Lessor may elect.`,
      ],
    },
    {
      number: '11',
      title: 'Breach and Termination',
      paragraphs: [
        `Should either party breach any material term of this Agreement and fail to remedy that breach within seven (7) days of receiving written notice to do so, the aggrieved party shall be entitled to cancel this Agreement and claim any damages suffered, without prejudice to any other rights available in law.`,
        `This Agreement is subject to the Consumer Protection Act 68 of 2008 where applicable, including the Tenant's right to cancel a fixed-term lease on twenty (20) business days' written notice, subject to the Lessor's right to claim a reasonable cancellation penalty.`,
      ],
    },
    {
      number: '12',
      title: 'Notice Period',
      paragraphs: [
        `Either party may terminate this Agreement on the expiry of the fixed term, or thereafter during any month-to-month continuation, by giving the other party at least one (1) calendar month's written notice.`,
      ],
    },
    {
      number: '13',
      title: 'Notices and Domicilium',
      paragraphs: [
        `The parties choose as their domicilium citandi et executandi (address for service of legal notices) the addresses set out in this Agreement: the Premises address above for the Tenant, and the Lessor's registered address.`,
        `Written notices delivered by hand, sent by prepaid registered post, or transmitted by electronic mail to the email address of the recipient shall be deemed validly given. Email notices shall be deemed received on the next business day following transmission, unless the sender receives a non-delivery notification.`,
      ],
    },
    {
      number: '14',
      title: 'Governing Law',
      paragraphs: [
        `This Agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa.`,
        `The parties acknowledge that this Agreement is subject to the Rental Housing Act 50 of 1999 and, where applicable, the Consumer Protection Act 68 of 2008. Any provision that is inconsistent with these Acts shall be read down to the extent necessary to comply with them.`,
      ],
    },
  ];

  if (data.notes && data.notes.trim().length > 0) {
    sections.push({
      number: '15',
      title: 'Additional Terms',
      paragraphs: [data.notes.trim()],
    });
  }

  return sections;
}
