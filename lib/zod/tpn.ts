import { z } from 'zod';

export const requestTpnCheckSchema = z.object({
  applicationId: z.string().cuid(),
});

export const waiveTpnCheckSchema = z.object({
  applicationId: z.string().cuid(),
  reason: z.string().trim().min(10).max(1000),
});

export const captureTpnConsentSchema = z.object({
  applicantId: z.string().cuid(),
  consentGiven: z.literal(true),
  signedName: z.string().trim().min(1).max(200),
  capturedAt: z.string().datetime(),
});
