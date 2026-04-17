import { z } from 'zod';

export const markInvoicePaidSchema = z.object({
  paidAt: z.string().optional(),
  paidAmountCents: z.number().int().nonnegative().optional(),
  paidNote: z.string().trim().max(500).optional().nullable(),
});
