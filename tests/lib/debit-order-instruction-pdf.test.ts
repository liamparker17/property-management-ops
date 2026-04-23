import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLeaseReference,
  renderDebitOrderInstruction,
} from '@/lib/reports/debit-order-instruction-pdf';

describe('debit-order-instruction-pdf', () => {
  it('renders a PDF buffer with a %PDF header and reference containing the lease id', () => {
    const leaseId = 'ckxlease123';
    const pdf = renderDebitOrderInstruction({
      org: { name: 'Acme PM' },
      lease: {
        id: leaseId,
        rentAmountCents: 1500000,
        paymentDueDay: 1,
        tenantDisplay: 'Jane Doe',
        unitLabel: 'Unit 1',
        propertyName: '123 Main St',
      },
      bankDetails: {
        bankName: 'FNB',
        accountName: 'Acme PM Trust',
        accountNumber: '1234567890',
        branchCode: '250655',
      },
    });
    assert.ok(Buffer.isBuffer(pdf));
    assert.ok(pdf.length > 100);
    const head = pdf.slice(0, 8).toString('binary');
    assert.ok(head.startsWith('%PDF-1.4'), `head was ${head}`);

    const reference = buildLeaseReference(leaseId);
    assert.ok(reference.endsWith(leaseId));
    const body = pdf.toString('binary');
    assert.ok(body.includes(reference), 'reference should appear in stream');
    assert.ok(body.includes('DEBIT ORDER INSTRUCTION'));
  });

  it('buildLeaseReference uses BANK_REF_PREFIX when set', () => {
    process.env.BANK_REF_PREFIX = 'ACME-';
    try {
      assert.equal(buildLeaseReference('abc'), 'ACME-abc');
    } finally {
      delete process.env.BANK_REF_PREFIX;
    }
  });

  it('defaults to PMO- prefix when env unset', () => {
    assert.equal(buildLeaseReference('xyz'), 'PMO-xyz');
  });
});
