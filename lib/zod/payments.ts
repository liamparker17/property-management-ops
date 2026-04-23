import { z } from 'zod';

export const paymentMethodEnum = z.enum(['EFT', 'CASH', 'CHEQUE', 'CARD_MANUAL', 'OTHER']);
export const receiptSourceEnum = z.enum(['MANUAL', 'CSV_IMPORT', 'STITCH', 'DEBICHECK']);
export const allocationTargetEnum = z.enum(['INVOICE_LINE_ITEM', 'DEPOSIT', 'LATE_FEE', 'UNAPPLIED']);

export const recordIncomingPaymentSchema = z.object({
  tenantId: z.string().cuid().optional().nullable(),
  leaseId: z.string().cuid().optional().nullable(),
  receivedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
  amountCents: z.number().int().positive(),
  method: paymentMethodEnum,
  source: receiptSourceEnum.default('MANUAL'),
  externalRef: z.string().trim().max(200).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const importReceiptsCsvSchema = z.object({
  csv: z.string().min(1),
});

const allocationInputSchema = z.object({
  target: allocationTargetEnum,
  invoiceLineItemId: z.string().cuid().optional().nullable(),
  depositLeaseId: z.string().cuid().optional().nullable(),
  amountCents: z.number().int().positive(),
});

export const allocateReceiptSchema = z.object({
  allocations: z.array(allocationInputSchema).optional(),
});

export type AllocationInput = z.infer<typeof allocationInputSchema>;

export const reverseAllocationSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
