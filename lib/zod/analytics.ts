import { z } from 'zod';

export const rangePresetSchema = z.enum(['1m', '3m', '12m', 'ytd']);
export const compareModeSchema = z.enum(['prior', 'yoy', 'off']);

export const analyticsSearchParamsSchema = z.object({
  range: z.union([rangePresetSchema, z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  compare: compareModeSchema.optional(),
  properties: z.string().optional(),
  landlords: z.string().optional(),
  agents: z.string().optional(),
});

export type AnalyticsSearchParams = z.infer<typeof analyticsSearchParamsSchema>;
