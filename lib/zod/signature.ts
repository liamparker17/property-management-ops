import { z } from 'zod';

export const signLeaseSchema = z.object({
  signedName: z.string().trim().min(3).max(120),
  agreed: z.literal(true),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  locationText: z.string().trim().max(200).optional().nullable(),
});

export const createReviewRequestSchema = z.object({
  clauseExcerpt: z.string().trim().min(3).max(2000),
  tenantNote: z.string().trim().min(3).max(2000),
});

export const respondReviewRequestSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'RESOLVED']),
  pmResponse: z.string().trim().max(2000).optional().nullable(),
});
