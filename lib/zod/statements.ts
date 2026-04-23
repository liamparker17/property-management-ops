import { z } from 'zod';

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

export const generateStatementSchema = z.object({
  period: z.object({
    start: isoDate,
    end: isoDate,
  }),
});

export const regenerateStatementSchema = z.object({}).strict();

export type GenerateStatementInput = z.infer<typeof generateStatementSchema>;
