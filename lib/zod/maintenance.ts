import { z } from 'zod';

export const maintenancePriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const maintenanceStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export const createMaintenanceRequestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  priority: maintenancePriorityEnum.default('MEDIUM'),
});

export const updateMaintenanceRequestSchema = z.object({
  status: maintenanceStatusEnum.optional(),
  priority: maintenancePriorityEnum.optional(),
  internalNotes: z.string().trim().max(4000).optional().nullable(),
});
