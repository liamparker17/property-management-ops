import { z } from 'zod';

export const generateLandlordPackSchema = z.object({
  landlordId: z.string().cuid(),
  yearId: z.string().cuid(),
  transmissionAdapter: z.string().optional(),
});

export const generateTenantPackSchema = z.object({
  tenantId: z.string().cuid(),
  yearId: z.string().cuid(),
  transmissionAdapter: z.string().optional(),
});

export const regeneratePackSchema = z.object({
  packId: z.string().cuid(),
});
