import { z } from 'zod';

export const createLandlordSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  vatNumber: z.string().max(40).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const updateLandlordSchema = createLandlordSchema.partial().extend({
  archived: z.boolean().optional(),
});
