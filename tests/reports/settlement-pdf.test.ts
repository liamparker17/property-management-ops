import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { renderSettlementStatement, type SettlementReportData } from '@/lib/reports/settlement-pdf';

function fixture(overrides?: Partial<SettlementReportData>): SettlementReportData {
  return {
    org: { name: 'Sea View Property Mgmt' },
    lease: { id: 'lease-abc' },
    tenant: { firstName: 'Jane', lastName: 'Doe' },
    unit: { label: '101', propertyName: 'Sea View' },
    settlement: {
      id: 'ds-1',
      depositHeldCents: 100_000,
      chargesAppliedCents: 30_000,
      refundDueCents: 70_000,
      balanceOwedCents: 0,
      finalizedAt: new Date('2026-04-25T10:00:00.000Z'),
    },
    charges: [
      {
        id: 'c-1',
        label: 'Cleaning',
        amountCents: 20_000,
        responsibility: 'TENANT',
        sourceInspectionItemId: 'inspitem123456',
      },
      {
        id: 'c-2',
        label: 'Wall repaint',
        amountCents: 10_000,
        responsibility: 'TENANT',
        sourceInspectionItemId: null,
      },
    ],
    ...(overrides ?? {}),
  };
}

function sha(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('renderSettlementStatement', () => {
  it('produces byte-identical output across two invocations with identical input', async () => {
    const a = await renderSettlementStatement(fixture());
    const b = await renderSettlementStatement(fixture());
    assert.equal(sha(a), sha(b));
  });

  it('shows balance owed only when shortfall is positive', async () => {
    const noShortfall = await renderSettlementStatement(fixture());
    assert.equal(noShortfall.toString().includes('Balance owed by tenant'), false);
    const shortfall = await renderSettlementStatement(
      fixture({
        settlement: {
          id: 'ds-2',
          depositHeldCents: 50_000,
          chargesAppliedCents: 50_000,
          refundDueCents: 0,
          balanceOwedCents: 30_000,
          finalizedAt: new Date('2026-04-25T10:00:00.000Z'),
        },
      }),
    );
    assert.equal(shortfall.toString().includes('Balance owed by tenant'), true);
  });

  it('renders empty state when no charges captured', async () => {
    const buf = await renderSettlementStatement(fixture({ charges: [] }));
    assert.equal(buf.toString().includes('No move-out charges captured'), true);
  });
});
