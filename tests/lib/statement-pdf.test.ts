import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { renderStatementPdf, type StatementWithLines } from '@/lib/reports/statement-pdf';

function sample(type: 'TENANT' | 'LANDLORD' | 'TRUST'): StatementWithLines {
  const genAt = new Date('2026-04-23T12:00:00.000Z');
  return {
    id: 'stmt-1',
    orgId: 'org-1',
    type,
    subjectType: type === 'TENANT' ? 'Tenant' : 'Landlord',
    subjectId: 'subj-1',
    periodStart: new Date('2026-03-01T00:00:00.000Z'),
    periodEnd: new Date('2026-03-31T23:59:59.000Z'),
    openingBalanceCents: 100000,
    closingBalanceCents: 150000,
    totalsJson: { example: true } as unknown as StatementWithLines['totalsJson'],
    storageKey: null,
    generatedAt: genAt,
    lines: [
      {
        id: 'line-1',
        statementId: 'stmt-1',
        occurredAt: new Date('2026-03-05T08:00:00.000Z'),
        description: 'Receipt EFT · REF-A',
        debitCents: 0,
        creditCents: 50000,
        runningBalanceCents: 150000,
        sourceType: 'PaymentReceipt',
        sourceId: 'r-1',
      },
      {
        id: 'line-2',
        statementId: 'stmt-1',
        occurredAt: new Date('2026-03-10T08:00:00.000Z'),
        description: 'Allocation · INVOICE_LINE_ITEM',
        debitCents: 20000,
        creditCents: 0,
        runningBalanceCents: 130000,
        sourceType: 'Allocation',
        sourceId: 'a-1',
      },
    ],
  } as StatementWithLines;
}

function hash(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('renderStatementPdf', () => {
  it('produces an identical buffer for two renders of the same TENANT statement', () => {
    const a = renderStatementPdf(sample('TENANT'));
    const b = renderStatementPdf(sample('TENANT'));
    assert.equal(hash(a), hash(b));
    assert.ok(a.length > 0);
  });

  it('is deterministic for LANDLORD statements', () => {
    const a = renderStatementPdf(sample('LANDLORD'));
    const b = renderStatementPdf(sample('LANDLORD'));
    assert.equal(hash(a), hash(b));
  });

  it('is deterministic for TRUST statements', () => {
    const a = renderStatementPdf(sample('TRUST'));
    const b = renderStatementPdf(sample('TRUST'));
    assert.equal(hash(a), hash(b));
  });

  it('produces distinct output for different types', () => {
    const tenant = renderStatementPdf(sample('TENANT'));
    const landlord = renderStatementPdf(sample('LANDLORD'));
    assert.notEqual(hash(tenant), hash(landlord));
  });
});
