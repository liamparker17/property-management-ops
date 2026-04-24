import { z } from 'zod';

export const openYearSchema = z.object({
  startDate: z.coerce.date(),
});

export const lockYearSchema = z.object({
  yearId: z.string().cuid(),
});

export const annualReconScopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ORG') }),
  z.object({ type: z.literal('PROPERTY'), id: z.string().cuid() }),
  z.object({ type: z.literal('LANDLORD'), id: z.string().cuid() }),
]);
