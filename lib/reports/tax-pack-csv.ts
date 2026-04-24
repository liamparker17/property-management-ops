import type { FinancialYear, Org, Prisma } from '@prisma/client';

import { formatZar } from '@/lib/format';
import { formatFinancialYearLabel } from '@/lib/financial-year';

type TaxPackRecord = Prisma.TaxPackGetPayload<{ include: { lines: true } }>;
type EvidenceRef = {
  type?: string;
  id?: string;
  occurredAt?: string;
  amountCents?: number;
  label?: string;
};

export type TaxPackCsvInput = TaxPackRecord & {
  org: Pick<Org, 'name'>;
  year: FinancialYear;
  subjectLabel: string;
};

function escapeCsv(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function parseEvidence(value: Prisma.JsonValue | null): EvidenceRef[] {
  return Array.isArray(value) ? (value as EvidenceRef[]) : [];
}

export async function renderTaxPackCsv(input: TaxPackCsvInput): Promise<string> {
  const header = [
    'financialYear',
    'orgName',
    'subjectLabel',
    'packId',
    'category',
    'subCategory',
    'lineAmountCents',
    'lineAmount',
    'evidenceType',
    'evidenceId',
    'evidenceDate',
    'evidenceAmountCents',
    'evidenceAmount',
    'evidenceLabel',
  ];

  const rows = [...input.lines]
    .sort((a, b) => a.category.localeCompare(b.category) || (a.subCategory ?? '').localeCompare(b.subCategory ?? '') || a.id.localeCompare(b.id))
    .flatMap((line) => {
      const refs = parseEvidence(line.evidenceRefs);
      const emitted = refs.length === 0 ? [{ type: '', id: '', occurredAt: '', amountCents: '', label: '' }] : refs;
      return emitted.map((ref) => [
        formatFinancialYearLabel(input.year.startDate),
        input.org.name,
        input.subjectLabel,
        input.id,
        line.category,
        line.subCategory ?? '',
        line.amountCents,
        formatZar(line.amountCents),
        ref.type ?? '',
        ref.id ?? '',
        ref.occurredAt ?? '',
        ref.amountCents ?? '',
        typeof ref.amountCents === 'number' ? formatZar(ref.amountCents) : '',
        ref.label ?? '',
      ]);
    });

  return [header, ...rows].map((row) => row.map((value) => escapeCsv(value)).join(',')).join('\n');
}
