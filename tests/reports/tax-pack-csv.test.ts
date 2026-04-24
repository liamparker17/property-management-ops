import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderTaxPackCsv } from '@/lib/reports/tax-pack-csv';

function fixture() {
  return {
    id: 'pack-1',
    orgId: 'org-1',
    yearId: 'year-1',
    subjectType: 'Tenant',
    subjectId: 'tenant-1',
    totalsJson: {
      incomeCents: 120000,
      expenseCents: 80000,
      netCents: 40000,
      depositMovementCents: 0,
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
        category: 'Rental charges, current',
        subCategory: null,
        amountCents: 120000,
        evidenceRefs: null,
      },
      {
        id: 'line-2',
        packId: 'pack-1',
        category: 'Supporting "receipts"',
        subCategory: 'RECEIPT',
        amountCents: 80000,
        evidenceRefs: [
          {
            type: 'RECEIPT',
            id: 'receipt-1',
            occurredAt: '2026-03-04T00:00:00.000Z',
            amountCents: 80000,
            label: 'EFT "main"',
          },
          {
            type: 'RECEIPT',
            id: 'receipt-2',
            occurredAt: '2026-03-10T00:00:00.000Z',
            amountCents: 0,
            label: 'Second',
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
      lockedAt: null,
      lockedById: null,
    },
    subjectLabel: 'Tenant A',
  };
}

describe('renderTaxPackCsv', () => {
  it('returns deterministic output for identical input', async () => {
    const one = await renderTaxPackCsv(fixture() as never);
    const two = await renderTaxPackCsv(fixture() as never);
    assert.equal(one, two);
  });

  it('emits one row per evidence item, or a single row when no evidence exists', async () => {
    const csv = await renderTaxPackCsv(fixture() as never);
    const rows = csv.trim().split('\n');
    assert.equal(rows.length, 1 + 1 + 2);
  });

  it('escapes commas and quotes correctly', async () => {
    const csv = await renderTaxPackCsv(fixture() as never);
    assert.equal(csv.includes('"Rental charges, current"'), true);
    assert.equal(csv.includes('"Supporting ""receipts"""'), true);
    assert.equal(csv.includes('"EFT ""main"""'), true);
  });
});
