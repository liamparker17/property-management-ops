import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { renderTaxPackPdf } from '@/lib/reports/tax-pack-pdf';

function fixture() {
  return {
    id: 'pack-1',
    orgId: 'org-1',
    yearId: 'year-1',
    subjectType: 'Landlord',
    subjectId: 'subject-1',
    totalsJson: {
      incomeCents: 250000,
      expenseCents: 50000,
      netCents: 200000,
      depositMovementCents: 10000,
      vatCents: 0,
    },
    storageKey: null,
    csvKey: null,
    previousStorageKeys: [],
    previousCsvKeys: [],
    generatedAt: new Date('2026-04-24T10:00:00.000Z'),
    regeneratedAt: null,
    regenerationCount: 0,
    transmissionAdapter: 'recordOnly',
    transmissionResult: { recorded: true },
    lines: [
      {
        id: 'line-1',
        packId: 'pack-1',
        category: 'Rental charges',
        subCategory: null,
        amountCents: 250000,
        evidenceRefs: null,
      },
      {
        id: 'line-2',
        packId: 'pack-1',
        category: 'Supporting receipts',
        subCategory: 'RECEIPT',
        amountCents: 250000,
        evidenceRefs: [
          {
            type: 'RECEIPT',
            id: 'receipt-1',
            occurredAt: '2026-03-05T00:00:00.000Z',
            amountCents: 250000,
            label: 'EFT · ABC123',
          },
        ],
      },
    ],
    org: { name: 'Regalis Property Ops' },
    year: {
      id: 'year-1',
      orgId: 'org-1',
      startDate: new Date('2025-03-01T00:00:00.000Z'),
      endDate: new Date('2026-02-28T00:00:00.000Z'),
      lockedAt: new Date('2026-03-10T00:00:00.000Z'),
      lockedById: 'user-1',
    },
    subjectLabel: 'Landlord A',
  };
}

function sha(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

describe('renderTaxPackPdf', () => {
  it('returns byte-identical output for identical input', async () => {
    const one = await renderTaxPackPdf(fixture() as never);
    const two = await renderTaxPackPdf(fixture() as never);
    assert.equal(sha(one), sha(two));
  });

  it('includes the approved header and footer copy', async () => {
    const buffer = await renderTaxPackPdf(fixture() as never);
    const text = buffer.toString('utf8');
    assert.equal(text.includes('Accountant support pack - not a SARS submission'), true);
    assert.equal(
      text.includes('Data is encrypted at rest by Neon (Postgres) and Vercel Blob (file storage) using provider-managed keys.'),
      true,
    );
  });
});
