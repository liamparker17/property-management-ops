export type BankTransaction = {
  occurredAt: Date;
  amountCents: number;
  reference: string;
  externalId: string;
  sourceRaw: unknown;
};

export type QboTxnInput = {
  Id?: string;
  id?: string;
  TxnDate?: string;
  txnDate?: string;
  Amount?: number | string;
  amount?: number | string;
  PaymentRefNum?: string;
  paymentRefNum?: string;
  PrivateNote?: string;
  privateNote?: string;
  [key: string]: unknown;
};

function coerceNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

export function mapQboTxnToBankTransaction(txn: QboTxnInput): BankTransaction {
  const id = (txn.Id ?? txn.id) as string | undefined;
  if (!id) throw new Error('QBO transaction is missing Id');

  const rawDate = (txn.TxnDate ?? txn.txnDate) as string | undefined;
  if (!rawDate) throw new Error('QBO transaction is missing TxnDate');
  const occurredAt = new Date(rawDate);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error(`QBO transaction has invalid TxnDate: ${rawDate}`);
  }

  const amount = coerceNumber(txn.Amount ?? txn.amount);
  if (!Number.isFinite(amount)) {
    throw new Error('QBO transaction is missing Amount');
  }
  const amountCents = Math.round(amount * 100);

  const reference = String(
    txn.PaymentRefNum ?? txn.paymentRefNum ?? txn.PrivateNote ?? txn.privateNote ?? id,
  );

  return {
    occurredAt,
    amountCents,
    reference,
    externalId: id,
    sourceRaw: txn,
  };
}
