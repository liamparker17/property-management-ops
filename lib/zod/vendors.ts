import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(200).optional().nullable(),
  contactEmail: z.string().trim().email().max(320).optional().nullable(),
  contactPhone: z.string().trim().max(32).optional().nullable(),
  categories: z.array(z.string().trim().min(1).max(64)).default([]),
});

export const updateVendorSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  contactName: z.string().trim().max(200).optional().nullable(),
  contactEmail: z.string().trim().email().max(320).optional().nullable(),
  contactPhone: z.string().trim().max(32).optional().nullable(),
  categories: z.array(z.string().trim().min(1).max(64)).optional(),
});
