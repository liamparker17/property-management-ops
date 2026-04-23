import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapQboTxnToBankTransaction } from '@/lib/integrations/qbo/mapping';

describe('mapQboTxnToBankTransaction', () => {
  it('maps a canonical QBO txn shape to a BankTransaction', () => {
    const txn = {
      Id: 'qbo-123',
      TxnDate: '2026-04-10',
      Amount: 1234.56,
      PaymentRefNum: 'PMO-lease-1',
      PrivateNote: 'ignored when ref present',
    };
    const mapped = mapQboTxnToBankTransaction(txn);
    assert.equal(mapped.externalId, 'qbo-123');
    assert.equal(mapped.amountCents, 123456);
    assert.equal(mapped.reference, 'PMO-lease-1');
    assert.ok(mapped.occurredAt instanceof Date);
    assert.equal(mapped.occurredAt.getUTCFullYear(), 2026);
    assert.equal(mapped.sourceRaw, txn);
  });

  it('falls back to PrivateNote then Id when PaymentRefNum is missing', () => {
    const mapped = mapQboTxnToBankTransaction({
      Id: 'qbo-999',
      TxnDate: '2026-04-11',
      Amount: '500.00',
      PrivateNote: 'PMO-xyz',
    });
    assert.equal(mapped.reference, 'PMO-xyz');
    assert.equal(mapped.amountCents, 50000);

    const onlyId = mapQboTxnToBankTransaction({
      Id: 'qbo-only',
      TxnDate: '2026-04-12',
      Amount: 1,
    });
    assert.equal(onlyId.reference, 'qbo-only');
  });

  it('throws when required fields are missing', () => {
    assert.throws(() =>
      mapQboTxnToBankTransaction({ TxnDate: '2026-04-10', Amount: 1 } as unknown as {
        Id: string;
        TxnDate: string;
        Amount: number;
      }),
    );
    assert.throws(() =>
      mapQboTxnToBankTransaction({ Id: 'x', Amount: 1 } as unknown as {
        Id: string;
        TxnDate: string;
        Amount: number;
      }),
    );
  });
});
