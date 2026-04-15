import { z } from 'zod';

export const roleEnum = z.enum(['ADMIN','PROPERTY_MANAGER','FINANCE','TENANT']);

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: roleEnum,
  password: z.string().min(8).max(200),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: roleEnum.optional(),
  disabled: z.boolean().optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  expiringWindowDays: z.number().int().min(1).max(365).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});
