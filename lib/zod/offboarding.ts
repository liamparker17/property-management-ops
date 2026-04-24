import { z } from 'zod';

export const chargeResponsibilityEnum = z.enum(['LANDLORD', 'TENANT', 'SHARED']);

const money = z.number().int().nonnegative();

export const openOffboardingCaseSchema = z.object({
  leaseId: z.string().cuid(),
});

export const toggleOffboardingTaskSchema = z.object({
  done: z.boolean(),
});

export const addMoveOutChargeSchema = z.object({
  label: z.string().trim().min(1).max(200),
  amountCents: money,
  responsibility: chargeResponsibilityEnum,
  sourceInspectionItemId: z.string().cuid().optional(),
});

export const finaliseDepositSettlementSchema = z.object({}).strict();
