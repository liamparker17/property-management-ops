import { formatDate, formatZar } from '@/lib/format';

export type SettlementChargeData = {
  id: string;
  label: string;
  amountCents: number;
  responsibility: 'LANDLORD' | 'TENANT' | 'SHARED';
  sourceInspectionItemId: string | null;
};

export type SettlementReportData = {
  org: { name: string };
  lease: { id: string };
  tenant: { firstName: string; lastName: string } | null;
  unit: { label: string; propertyName: string } | null;
  settlement: {
    id: string;
    depositHeldCents: number;
    chargesAppliedCents: number;
    refundDueCents: number;
    balanceOwedCents: number;
    finalizedAt: Date;
  };
  charges: SettlementChargeData[];
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shortRef(id: string | null): string {
  return id ? id.slice(-6) : '';
}

const STYLES = `body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111;margin:32px;}h1{margin:0 0 8px 0;font-size:20px;}.meta{margin:2px 0;color:#444;font-size:12px;}section{margin-top:16px;}table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;}.num{text-align:right;font-variant-numeric:tabular-nums;}.totals p{margin:4px 0;}.shortfall{color:#9b1c1c;font-weight:600;}`;

function chargeRow(c: SettlementChargeData): string {
  return `<tr><td>${escapeHtml(c.label)}</td><td class="num">${formatZar(c.amountCents)}</td><td>${c.responsibility}</td><td>${escapeHtml(shortRef(c.sourceInspectionItemId))}</td></tr>`;
}

function sortedCharges(charges: SettlementChargeData[]): SettlementChargeData[] {
  return [...charges].sort((a, b) => a.id.localeCompare(b.id));
}

export async function renderSettlementStatement(data: SettlementReportData): Promise<Buffer> {
  const tenantName = data.tenant ? `${data.tenant.firstName} ${data.tenant.lastName}` : '—';
  const unitLine = data.unit ? `${data.unit.propertyName} · Unit ${data.unit.label}` : '—';
  const finalizedAt = formatDate(data.settlement.finalizedAt);

  const rows = sortedCharges(data.charges).map(chargeRow).join('');
  const chargesTable = data.charges.length
    ? `<table><thead><tr><th>Charge</th><th class="num">Amount</th><th>Responsibility</th><th>Inspection ref</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="meta">No move-out charges captured.</p>';

  const balanceOwedBlock = data.settlement.balanceOwedCents > 0
    ? `<p class="shortfall">Balance owed by tenant: ${formatZar(data.settlement.balanceOwedCents)}</p>`
    : '';

  const body = `<header>
<h1>Deposit Settlement Statement</h1>
<p class="meta">${escapeHtml(data.org.name)}</p>
<p class="meta">Lease ${escapeHtml(data.lease.id)} · Tenant ${escapeHtml(tenantName)}</p>
<p class="meta">${escapeHtml(unitLine)}</p>
<p class="meta">Finalised ${finalizedAt}</p>
</header>
<section>
<h2 class="meta">Charges</h2>
${chargesTable}
</section>
<section class="totals">
<p>Deposit held: <strong>${formatZar(data.settlement.depositHeldCents)}</strong></p>
<p>Charges applied: <strong>${formatZar(data.settlement.chargesAppliedCents)}</strong></p>
<p>Refund due to tenant: <strong>${formatZar(data.settlement.refundDueCents)}</strong></p>
${balanceOwedBlock}
</section>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Deposit Settlement</title><style>${STYLES}</style></head><body>${body}</body></html>`;
  return Buffer.from(html, 'utf8');
}
