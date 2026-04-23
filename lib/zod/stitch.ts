import { z } from 'zod';

export const stitchCheckoutSchema = z.object({
  invoiceId: z.string().cuid(),
  amountCents: z.number().int().positive(),
});

export const stitchConnectCallbackSchema = z.object({
  provider: z.enum(['STITCH_PAYMENTS', 'STITCH_DEBICHECK', 'STITCH_PAYOUTS']),
  externalAccountId: z.string().trim().min(1).optional().nullable(),
  accessToken: z.string().trim().min(1),
  refreshToken: z.string().trim().min(1).optional().nullable(),
  tokenExpiresAt: z.coerce.date().optional().nullable(),
});

export const debicheckMandateRequestSchema = z.object({
  leaseId: z.string().cuid(),
  upperCapCents: z.number().int().positive(),
});

export const tenantDebicheckRequestSchema = z.object({
  leaseId: z.string().cuid(),
  upperCapCents: z.number().int().positive(),
});
