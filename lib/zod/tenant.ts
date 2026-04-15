import { z } from 'zod';

export const createTenantSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  idNumber: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateTenantSchema = createTenantSchema.partial();
