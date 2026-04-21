import { z } from 'zod';

export const createManagingAgentSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const updateManagingAgentSchema = createManagingAgentSchema.partial().extend({
  archived: z.boolean().optional(),
});
