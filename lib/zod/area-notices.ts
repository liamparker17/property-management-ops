import { z } from 'zod';

export const audienceQuerySchema = z.object({
  propertyIds: z.array(z.string().min(1)).optional(),
  unitTypes: z.array(z.string().min(1)).optional(),
  leaseStates: z.array(z.enum(['DRAFT', 'ACTIVE', 'TERMINATED', 'RENEWED'])).optional(),
  roles: z.array(z.enum(['ADMIN', 'PROPERTY_MANAGER', 'FINANCE', 'TENANT', 'LANDLORD', 'MANAGING_AGENT'])).optional(),
});

export const createNoticeSchema = z.object({
  type: z.enum(['OUTAGE', 'ESTATE', 'SECURITY', 'WATER', 'POWER', 'GENERAL']),
  title: z.string().min(1),
  body: z.string().min(1),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  audienceQuery: audienceQuerySchema,
});

export const publishNoticeSchema = z.object({});

export const dispatchNoticeSchema = z.object({});
