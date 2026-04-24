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

const isoDateTime = z.string().refine(
  (s) => !Number.isNaN(Date.parse(s)),
  'Invalid date',
);

const money = z.number().int().positive();

export const assignVendorSchema = z.object({
  vendorId: z.string().cuid(),
  estimatedCostCents: money.optional(),
  scheduledFor: isoDateTime.optional(),
});

export const captureQuoteSchema = z.object({
  vendorId: z.string().cuid().optional(),
  amountCents: money,
  documentStorageKey: z.string().trim().max(500).optional(),
  note: z.string().trim().max(2000).optional(),
});

export const scheduleMaintenanceSchema = z.object({
  scheduledFor: isoDateTime,
});

export const completeMaintenanceSchema = z.object({
  completedAt: isoDateTime.optional(),
  summary: z.string().trim().max(4000).optional(),
});

export const captureMaintenanceInvoiceSchema = z.object({
  invoiceCents: money,
  invoiceBlobKey: z.string().trim().max(500).optional(),
});

export const addMaintenanceWorklogSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});
