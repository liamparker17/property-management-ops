import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const onboardTenantSchema = z
  .object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    email: z.string().email(),
    phone: z.string().trim().max(40).optional().nullable(),
    idNumber: z.string().trim().max(40).optional().nullable(),
    tenantNotes: z.string().max(2000).optional().nullable(),

    unitId: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate,
    rentAmountCents: z.number().int().min(0),
    depositAmountCents: z.number().int().min(0),
    heldInTrustAccount: z.boolean().default(false),
    paymentDueDay: z.number().int().min(1).max(31),
    leaseNotes: z.string().max(2000).optional().nullable(),

    sendInvite: z.boolean().default(true),
    sendSmsInvite: z.boolean().default(false),
  })
  .refine((v) => new Date(v.startDate) <= new Date(v.endDate), {
    path: ['endDate'],
    message: 'endDate must be on or after startDate',
  });
