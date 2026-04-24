import type { FinancialYear, Org, Prisma } from '@prisma/client';

import { formatDate, formatZar } from '@/lib/format';
import { formatFinancialYearLabel } from '@/lib/financial-year';

type TaxPackLineRecord = Prisma.TaxPackLineGetPayload<Record<string, never>>;
type TaxPackRecord = Prisma.TaxPackGetPayload<{ include: { lines: true } }>;

export type TaxPackPdfInput = TaxPackRecord & {
  org: Pick<Org, 'name'>;
  year: FinancialYear;
  subjectLabel: string;
};

type EvidenceRef = {
  type?: string;
  id?: string;
  occurredAt?: string;
  amountCents?: number;
  label?: string;
};

const ENCRYPTION_DISCLOSURE =
  'Data is encrypted at rest by Neon (Postgres) and Vercel Blob (file storage) using provider-managed keys.';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseEvidence(line: TaxPackLineRecord): EvidenceRef[] {
  if (!Array.isArray(line.evidenceRefs)) return [];
  return line.evidenceRefs as EvidenceRef[];
}

function sortedLines(input: TaxPackPdfInput) {
  return [...input.lines].sort((a, b) => {
    const category = a.category.localeCompare(b.category);
    if (category !== 0) return category;
    return (a.subCategory ?? '').localeCompare(b.subCategory ?? '') || a.id.localeCompare(b.id);
  });
}

function totalsBlock(input: TaxPackPdfInput) {
  const totals = (input.totalsJson ?? {}) as Record<string, number | undefined>;
  return `<section class="totals">
    <div><span>Income</span><strong>${formatZar(totals.incomeCents ?? 0)}</strong></div>
    <div><span>Expenses</span><strong>${formatZar(totals.expenseCents ?? 0)}</strong></div>
    <div><span>Net</span><strong>${formatZar(totals.netCents ?? 0)}</strong></div>
    <div><span>Deposit movement</span><strong>${formatZar(totals.depositMovementCents ?? 0)}</strong></div>
    <div><span>VAT</span><strong>${formatZar(totals.vatCents ?? 0)}</strong></div>
  </section>`;
}

function breakdownRows(input: TaxPackPdfInput) {
  const grouped = new Map<string, number>();
  for (const line of sortedLines(input)) {
    grouped.set(line.category, (grouped.get(line.category) ?? 0) + line.amountCents);
  }
  return [...grouped.entries()]
    .map(
      ([category, amount]) =>
        `<tr><td>${escapeHtml(category)}</td><td class="num">${formatZar(amount)}</td></tr>`,
    )
    .join('');
}

function auditGroups(input: TaxPackPdfInput) {
  const groups = new Map<string, Array<EvidenceRef & { amountCents: number }>>();
  for (const line of sortedLines(input)) {
    const key = line.subCategory ?? 'UNCATEGORISED';
    const refs = parseEvidence(line);
    if (!groups.has(key)) groups.set(key, []);
    const bucket = groups.get(key)!;
    if (refs.length === 0) {
      bucket.push({ type: key, id: '', amountCents: line.amountCents, occurredAt: '', label: '' });
      continue;
    }
    for (const ref of refs) {
      bucket.push({
        ...ref,
        amountCents: typeof ref.amountCents === 'number' ? ref.amountCents : line.amountCents,
      });
    }
  }

  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, rows]) => {
      const body = rows
        .sort((a, b) => {
          const dateDiff = (a.occurredAt ?? '').localeCompare(b.occurredAt ?? '');
          if (dateDiff !== 0) return dateDiff;
          return (a.id ?? '').localeCompare(b.id ?? '');
        })
        .map(
          (row) =>
            `<tr><td>${escapeHtml(row.occurredAt ? formatDate(row.occurredAt) : '')}</td><td>${escapeHtml(
              row.id ?? '',
            )}</td><td>${escapeHtml(row.label ?? '')}</td><td class="num">${formatZar(
              row.amountCents,
            )}</td></tr>`,
        )
        .join('');
      return `<section class="audit-group"><h3>${escapeHtml(group)}</h3><table><thead><tr><th>Date</th><th>Ref</th><th>Label</th><th class="num">Amount</th></tr></thead><tbody>${body}</tbody></table></section>`;
    })
    .join('');
}

const STYLES = `
body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111827;margin:28px;}
h1,h2,h3,p{margin:0;}
header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #d1d5db;padding-bottom:16px;}
.eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6b7280;}
.title{font-size:28px;font-weight:300;margin-top:8px;}
.meta{font-size:12px;color:#4b5563;line-height:1.6;}
.totals{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:20px 0;}
.totals div{border:1px solid #d1d5db;padding:10px 12px;background:#f9fafb;}
.totals span{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:6px;}
.totals strong{font-size:16px;font-weight:600;}
section{margin-top:24px;}
table{width:100%;border-collapse:collapse;font-size:12px;}
th,td{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top;}
.num{text-align:right;font-variant-numeric:tabular-nums;}
footer{margin-top:28px;border-top:1px solid #d1d5db;padding-top:12px;font-size:8pt;color:#4b5563;}
`;

export async function renderTaxPackPdf(input: TaxPackPdfInput): Promise<Buffer> {
  const yearLabel = formatFinancialYearLabel(input.year.startDate);
  const generatedOn = formatDate(input.generatedAt);
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(`${yearLabel} Tax Support Pack`)}</title>
    <style>${STYLES}</style>
  </head>
  <body>
    <header>
      <div>
        <p class="eyebrow">Accountant support pack</p>
        <h1 class="title">${escapeHtml(yearLabel)} Tax Support Pack</h1>
        <p class="meta">Subject: ${escapeHtml(input.subjectLabel)}</p>
        <p class="meta">Organisation: ${escapeHtml(input.org.name)}</p>
      </div>
      <div class="meta">
        <p>Generated: ${escapeHtml(generatedOn)}</p>
        <p>Pack: ${escapeHtml(input.id)}</p>
        <p>Accountant support pack - not a SARS submission</p>
      </div>
    </header>
    ${totalsBlock(input)}
    <section>
      <h2>Category breakdown</h2>
      <table>
        <thead><tr><th>Category</th><th class="num">Amount</th></tr></thead>
        <tbody>${breakdownRows(input)}</tbody>
      </table>
    </section>
    <section>
      <h2>Audit chain</h2>
      ${auditGroups(input)}
    </section>
    <footer>${escapeHtml(ENCRYPTION_DISCLOSURE)}</footer>
  </body>
</html>`;

  return Buffer.from(html, 'utf8');
}
