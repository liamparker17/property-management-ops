import { formatZar } from '@/lib/format';

export type DebitOrderBankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
};

export type DebitOrderInstructionInput = {
  org: { name: string };
  lease: {
    id: string;
    rentAmountCents: number;
    paymentDueDay: number;
    tenantDisplay: string;
    unitLabel: string;
    propertyName: string;
  };
  bankDetails: DebitOrderBankDetails;
};

function getPrefix(): string {
  return process.env.BANK_REF_PREFIX?.trim() || 'PMO-';
}

export function buildLeaseReference(leaseId: string): string {
  return `${getPrefix()}${leaseId}`;
}

function pdfEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildLines(input: DebitOrderInstructionInput): string[] {
  const reference = buildLeaseReference(input.lease.id);
  const suggestedCapCents = Math.round(input.lease.rentAmountCents * 1.25);
  return [
    `${input.org.name}`,
    `DEBIT ORDER INSTRUCTION`,
    ``,
    `Tenant:   ${input.lease.tenantDisplay}`,
    `Property: ${input.lease.propertyName}`,
    `Unit:     ${input.lease.unitLabel}`,
    `Lease ID: ${input.lease.id}`,
    ``,
    `Bank:           ${input.bankDetails.bankName}`,
    `Account name:   ${input.bankDetails.accountName}`,
    `Account number: ${input.bankDetails.accountNumber}`,
    `Branch code:    ${input.bankDetails.branchCode}`,
    ``,
    `Unique reference (use exactly as shown):`,
    `  ${reference}`,
    ``,
    `Monthly rent:      ${formatZar(input.lease.rentAmountCents)}`,
    `Suggested cap:     ${formatZar(suggestedCapCents)}`,
    `Debit day:         ${input.lease.paymentDueDay}`,
    ``,
    `Set up this debit order in your banking app using the details above.`,
    `The reference MUST match exactly for automatic allocation.`,
  ];
}

// Deterministic single-page PDF (plain PDF 1.4 text stream); no external PDF lib dependency.
export function renderDebitOrderInstruction(input: DebitOrderInstructionInput): Buffer {
  const lines = buildLines(input);
  const streamParts: string[] = ['BT', '/F1 11 Tf', '14 TL', '72 760 Td'];
  for (let i = 0; i < lines.length; i++) {
    streamParts.push(`(${pdfEscape(lines[i])}) Tj`);
    if (i < lines.length - 1) streamParts.push('T*');
  }
  streamParts.push('ET');
  const stream = streamParts.join('\n');
  const streamBytes = Buffer.byteLength(stream, 'binary');

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push(
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  );
  objects.push(`<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  let output = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(output, 'binary'));
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(output, 'binary');
  output += `xref\n0 ${objects.length + 1}\n`;
  output += '0000000000 65535 f \n';
  for (const off of offsets) {
    output += `${off.toString().padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(output, 'binary');
}
