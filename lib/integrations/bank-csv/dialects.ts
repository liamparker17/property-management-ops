import { ApiError } from '@/lib/errors';

export type BankCsvDialect = 'generic' | 'fnb' | 'absa' | 'standardbank' | 'nedbank';

export type DialectColumnMap = {
  receivedAt: string;
  amount: string;
  method: string;
  reference: string;
  note: string;
};

export type BankCsvDialectConfig = {
  dialect: BankCsvDialect;
  columns: DialectColumnMap;
};

const DIALECTS: Record<BankCsvDialect, BankCsvDialectConfig | null> = {
  generic: {
    dialect: 'generic',
    columns: {
      receivedAt: 'receivedAt',
      amount: 'amount',
      method: 'method',
      reference: 'reference',
      note: 'note',
    },
  },
  // TODO (M4): fnb dialect — map FNB export headers (e.g., "Date", "Amount", "Description") onto canonical fields.
  fnb: null,
  // TODO (M4): absa dialect.
  absa: null,
  // TODO (M4): standardbank dialect.
  standardbank: null,
  // TODO (M4): nedbank dialect.
  nedbank: null,
};

export function resolveDialect(name: BankCsvDialect): BankCsvDialectConfig {
  const config = DIALECTS[name];
  if (!config) {
    throw ApiError.validation({ dialect: 'Only "generic" dialect is supported in M2' });
  }
  return config;
}
