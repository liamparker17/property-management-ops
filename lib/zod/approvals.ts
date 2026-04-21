import { z } from 'zod';

export const approvalKindEnum = z.enum([
  'MAINTENANCE_COMMIT',
  'LEASE_CREATE',
  'LEASE_RENEW',
  'RENT_CHANGE',
  'TENANT_EVICT',
  'PROPERTY_REMOVE',
]);

export const decideApprovalSchema = z.object({
  decision: z.enum(['APPROVED', 'DECLINED']),
  decisionNote: z.string().max(2000).optional(),
});
