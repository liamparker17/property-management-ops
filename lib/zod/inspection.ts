import { z } from 'zod';

export const inspectionTypeEnum = z.enum(['MOVE_IN', 'MOVE_OUT', 'INTERIM']);
export const inspectionStatusEnum = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'SIGNED_OFF',
  'CANCELLED',
]);
export const conditionRatingEnum = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']);
export const chargeResponsibilityEnum = z.enum(['LANDLORD', 'TENANT', 'SHARED']);

const isoDateTime = z.string().refine(
  (s) => !Number.isNaN(Date.parse(s)),
  'Invalid date',
);

const money = z.number().int().nonnegative();

export const createInspectionSchema = z.object({
  leaseId: z.string().cuid(),
  type: inspectionTypeEnum,
  scheduledAt: isoDateTime,
});

export const recordAreaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  orderIndex: z.number().int().nonnegative(),
});

export const recordItemSchema = z.object({
  label: z.string().trim().min(1).max(120),
  condition: conditionRatingEnum,
  note: z.string().trim().max(2000).optional(),
  estimatedCostCents: money.optional(),
  responsibility: chargeResponsibilityEnum.optional(),
});

export const completeInspectionSchema = z.object({
  summary: z.string().trim().max(4000).optional(),
});

export const signerRoleEnum = z.enum([
  'ADMIN',
  'PROPERTY_MANAGER',
  'FINANCE',
  'TENANT',
  'LANDLORD',
  'MANAGING_AGENT',
]);

export const signInspectionSchema = z.object({
  signerRole: signerRoleEnum,
  signedName: z.string().trim().min(1).max(200),
  ipAddress: z.string().trim().max(64).optional(),
  userAgent: z.string().trim().max(500).optional(),
});

export const registerPhotoSchema = z.object({
  storageKey: z.string().trim().min(1).max(500),
  caption: z.string().trim().max(500).optional(),
});
