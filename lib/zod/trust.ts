import { z } from 'zod';

export const ledgerEntryTypeEnum = z.enum([
  'RECEIPT',
  'DISBURSEMENT',
  'ALLOCATION',
  'REVERSAL',
  'DEPOSIT_IN',
  'DEPOSIT_OUT',
  'FEE',
]);

export const disburseToLandlordSchema = z.object({
  landlordId: z.string().cuid(),
  amountCents: z.number().int().positive(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const recordManualLedgerEntrySchema = z.object({
  occurredAt: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date')
    .optional(),
  type: ledgerEntryTypeEnum,
  amountCents: z.number().int(),
  tenantId: z.string().cuid().optional().nullable(),
  leaseId: z.string().cuid().optional().nullable(),
  sourceType: z.string().trim().max(100).optional().nullable(),
  sourceId: z.string().trim().max(200).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});
