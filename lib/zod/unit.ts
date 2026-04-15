import { z } from 'zod';

export const createUnitSchema = z.object({
  propertyId: z.string().min(1),
  label: z.string().min(1).max(80),
  bedrooms: z.number().int().min(0).max(50).default(0),
  bathrooms: z.number().int().min(0).max(50).default(0),
  sizeSqm: z.number().int().min(1).max(100000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateUnitSchema = createUnitSchema.partial().omit({ propertyId: true });
