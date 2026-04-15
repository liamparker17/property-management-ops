import { z } from 'zod';

export const leaseStateEnum = z.enum(['DRAFT','ACTIVE','TERMINATED','RENEWED']);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export const createLeaseSchema = z
  .object({
    unitId: z.string().min(1),
    tenantIds: z.array(z.string().min(1)).min(1).max(10),
    primaryTenantId: z.string().min(1),
    startDate: isoDate,
    endDate: isoDate,
    rentAmountCents: z.number().int().min(0),
    depositAmountCents: z.number().int().min(0),
    heldInTrustAccount: z.boolean().default(false),
    paymentDueDay: z.number().int().min(1).max(31),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((v) => v.tenantIds.includes(v.primaryTenantId), {
    path: ['primaryTenantId'],
    message: 'primaryTenantId must be in tenantIds',
  })
  .refine((v) => new Date(v.startDate) <= new Date(v.endDate), {
    path: ['endDate'],
    message: 'endDate must be on or after startDate',
  });

export const updateDraftLeaseSchema = z.object({
  tenantIds: z.array(z.string().min(1)).min(1).max(10).optional(),
  primaryTenantId: z.string().min(1).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  rentAmountCents: z.number().int().min(0).optional(),
  depositAmountCents: z.number().int().min(0).optional(),
  heldInTrustAccount: z.boolean().optional(),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const terminateLeaseSchema = z.object({
  terminatedAt: isoDate,
  terminatedReason: z.string().min(1).max(1000),
});

export const leaseListQuerySchema = z.object({
  status: z.enum(['DRAFT','ACTIVE','EXPIRING','EXPIRED','TERMINATED','RENEWED']).optional(),
  unitId: z.string().optional(),
  propertyId: z.string().optional(),
  expiringWithinDays: z.coerce.number().int().min(1).max(365).optional(),
});
