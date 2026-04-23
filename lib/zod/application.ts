import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

const nullableMoney = z.number().int().min(0).nullable().optional();

export const applicationListQuerySchema = z.object({
  stage: z
    .enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VETTING', 'APPROVED', 'DECLINED', 'CONVERTED', 'WITHDRAWN'])
    .optional(),
  assignedReviewerId: z.string().cuid().optional(),
  propertyId: z.string().cuid().optional(),
  q: z.string().trim().min(1).max(200).optional(),
});

export const createApplicationSchema = z.object({
  applicant: z.object({
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    email: z.string().email(),
    phone: z.string().trim().min(1).max(40),
    idNumber: z.string().trim().max(40).nullable().optional(),
    employer: z.string().trim().max(200).nullable().optional(),
    grossMonthlyIncomeCents: nullableMoney,
    netMonthlyIncomeCents: nullableMoney,
  }),
  application: z.object({
    propertyId: z.string().cuid().nullable().optional(),
    unitId: z.string().cuid().nullable().optional(),
    requestedMoveIn: isoDate.nullable().optional(),
    sourceChannel: z.string().trim().max(120).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  }),
  consent: z.object({
    consentGiven: z.literal(true),
    signedName: z.string().trim().min(1).max(200),
    capturedAt: z.string().datetime(),
  }),
});

export const updateApplicationSchema = z.object({
  propertyId: z.string().cuid().nullable().optional(),
  unitId: z.string().cuid().nullable().optional(),
  requestedMoveIn: isoDate.nullable().optional(),
  sourceChannel: z.string().trim().max(120).nullable().optional(),
});

export const assignReviewerSchema = z.object({
  userId: z.string().cuid(),
});

export const addApplicationNoteSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const withdrawApplicationSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export const applicationDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'DECLINED']),
  reason: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(1000).optional(),
  overrideReason: z.string().trim().max(1000).optional(),
});

export const convertApplicationSchema = z
  .object({
    startDate: isoDate,
    endDate: isoDate,
    rentAmountCents: z.number().int().min(0),
    depositAmountCents: z.number().int().min(0),
    createPortalUser: z.boolean(),
  })
  .refine((value) => new Date(value.startDate) <= new Date(value.endDate), {
    path: ['endDate'],
    message: 'endDate must be on or after startDate',
  });
