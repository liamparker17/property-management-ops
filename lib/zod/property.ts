import { z } from 'zod';

export const provinceEnum = z.enum(['GP','WC','KZN','EC','FS','LP','MP','NW','NC']);

export const createPropertySchema = z.object({
  name: z.string().min(1).max(200),
  addressLine1: z.string().min(1).max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  suburb: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  province: provinceEnum,
  postalCode: z.string().min(1).max(10),
  notes: z.string().max(2000).optional().nullable(),
  autoCreateMainUnit: z.boolean().default(true),
});

export const updatePropertySchema = createPropertySchema.partial().omit({ autoCreateMainUnit: true });
