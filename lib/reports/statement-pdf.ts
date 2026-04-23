import type { Prisma } from '@prisma/client';

import { formatDate, formatZar } from '@/lib/format';

export type StatementWithLines = Prisma.StatementGetPayload<{ include: { lines: true } }>;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sortedLines(statement: StatementWithLines) {
  return [...statement.lines].sort((a, b) => {
    const ta = a.occurredAt instanceof Date ? a.occurredAt.getTime() : new Date(a.occurredAt).getTime();
    const tb = b.occurredAt instanceof Date ? b.occurredAt.getTime() : new Date(b.occurredAt).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

function lineRow(line: StatementWithLines['lines'][number]): string {
  const date = formatDate(line.occurredAt);
  const desc = escapeHtml(line.description);
  const debit = line.debitCents > 0 ? formatZar(line.debitCents) : '';
  const credit = line.creditCents > 0 ? formatZar(line.creditCents) : '';
  const balance = formatZar(line.runningBalanceCents);
  return `<tr><td>${date}</td><td>${desc}</td><td class="num">${debit}</td><td class="num">${credit}</td><td class="num">${balance}</td></tr>`;
}

function header(statement: StatementWithLines, title: string): string {
  const start = formatDate(statement.periodStart);
  const end = formatDate(statement.periodEnd);
  return `<header>
<h1>${escapeHtml(title)}</h1>
<p class="meta">Period: ${start} &mdash; ${end}</p>
<p class="meta">Subject: ${escapeHtml(statement.subjectType)} ${escapeHtml(statement.subjectId)}</p>
</header>`;
}

function balancesBlock(statement: StatementWithLines): string {
  return `<section class="balances">
<p>Opening balance: <strong>${formatZar(statement.openingBalanceCents)}</strong></p>
<p>Closing balance: <strong>${formatZar(statement.closingBalanceCents)}</strong></p>
</section>`;
}

function table(rows: string): string {
  return `<table>
<thead><tr><th>Date</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

const STYLES = `body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;margin:32px;}h1{margin:0 0 8px 0;font-size:20px;}.meta{margin:2px 0;color:#444;font-size:12px;}.balances p{margin:4px 0;}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px;}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;}.num{text-align:right;font-variant-numeric:tabular-nums;}`;

function wrap(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${STYLES}</style></head><body>${body}</body></html>`;
}

function renderTenant(statement: StatementWithLines): string {
  const rows = sortedLines(statement).map(lineRow).join('');
  const body = `${header(statement, 'Tenant Statement')}${balancesBlock(statement)}${table(rows)}`;
  return wrap('Tenant Statement', body);
}

function renderLandlord(statement: StatementWithLines): string {
  const rows = sortedLines(statement).map(lineRow).join('');
  const body = `${header(statement, 'Landlord Statement')}${balancesBlock(statement)}${table(rows)}`;
  return wrap('Landlord Statement', body);
}

function renderTrust(statement: StatementWithLines): string {
  const rows = sortedLines(statement).map(lineRow).join('');
  const body = `${header(statement, 'Trust Statement')}${balancesBlock(statement)}${table(rows)}`;
  return wrap('Trust Statement', body);
}

export function renderStatementPdf(statement: StatementWithLines): Buffer {
  let html: string;
  switch (statement.type) {
    case 'TENANT':
      html = renderTenant(statement);
      break;
    case 'LANDLORD':
      html = renderLandlord(statement);
      break;
    case 'TRUST':
      html = renderTrust(statement);
      break;
    default:
      html = wrap('Statement', `${header(statement, 'Statement')}${balancesBlock(statement)}`);
  }
  return Buffer.from(html, 'utf8');
}
