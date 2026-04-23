import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const onboardTenantSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().trim().max(40).optional().nullable(),
    idNumber: z.string().trim().max(40).optional().nullable(),
    tenantNotes: z.string().max(2000).optional().nullable(),

    unitId: z.string().min(1).optional(),
    startDate: isoDate,
    endDate: isoDate,
    rentAmountCents: z.number().int().min(0),
    depositAmountCents: z.number().int().min(0),
    heldInTrustAccount: z.boolean().default(false),
    paymentDueDay: z.number().int().min(1).max(31).optional(),
    leaseNotes: z.string().max(2000).optional().nullable(),

    sendInvite: z.boolean().default(true),
    sendSmsInvite: z.boolean().default(false),
    fromApplicationId: z.string().cuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fromApplicationId) return;

    if (!value.firstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firstName'],
        message: 'Required',
      });
    }
    if (!value.lastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lastName'],
        message: 'Required',
      });
    }
    if (!value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Required',
      });
    }
    if (!value.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unitId'],
        message: 'Required',
      });
    }
    if (!value.paymentDueDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentDueDay'],
        message: 'Required',
      });
    }
  })
  .refine((v) => new Date(v.startDate) <= new Date(v.endDate), {
    path: ['endDate'],
    message: 'endDate must be on or after startDate',
  });
