import { z } from 'zod';

const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: 'Invalid ISO date',
});

export const generateBillingRunSchema = z.object({
  periodStart: isoDate,
});

export const publishBillingRunSchema = z.object({
  allowEstimatesOverride: z.boolean().optional(),
});

export const addLineItemSchema = z.object({
  kind: z.enum([
    'RENT',
    'UTILITY_WATER',
    'UTILITY_ELECTRICITY',
    'UTILITY_GAS',
    'UTILITY_SEWER',
    'UTILITY_REFUSE',
    'ADJUSTMENT',
    'LATE_FEE',
    'DEPOSIT_CHARGE',
  ]),
  description: z.string().trim().min(1).max(240),
  quantity: z.union([z.number(), z.string()]).optional().nullable(),
  unitRateCents: z.number().int().optional().nullable(),
  amountCents: z.number().int(),
  sourceType: z.string().trim().max(60).optional().nullable(),
  sourceId: z.string().trim().max(120).optional().nullable(),
  estimated: z.boolean().optional(),
});
