import { z } from 'zod';

export const roleEnum = z.enum(['ADMIN','PROPERTY_MANAGER','FINANCE','TENANT','LANDLORD','MANAGING_AGENT']);

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: roleEnum,
  password: z.string().min(8).max(200),
  landlordId: z.string().cuid().optional(),
  managingAgentId: z.string().cuid().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: roleEnum.optional(),
  disabled: z.boolean().optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  expiringWindowDays: z.number().int().min(1).max(365).optional(),
  ownerType: z.enum(['PM_AGENCY', 'LANDLORD_DIRECT']).optional(),
  landlordApprovalThresholdCents: z.number().int().min(0).max(100_000_000).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});
