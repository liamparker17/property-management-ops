import { z } from 'zod';

export const runReconciliationSchema = z
  .object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  })
  .refine((v) => v.periodStart < v.periodEnd, {
    message: 'periodStart must be before periodEnd',
    path: ['periodEnd'],
  });

export const resolveExceptionSchema = z.object({
  note: z.string().trim().min(1, 'Note is required').max(2000),
});
