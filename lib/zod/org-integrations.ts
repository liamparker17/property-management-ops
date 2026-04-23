import { z } from 'zod';

export const integrationProviders = [
  'STITCH_PAYMENTS',
  'STITCH_DEBICHECK',
  'STITCH_PAYOUTS',
  'QUICKBOOKS',
  'TPN',
] as const;

export const integrationProviderEnum = z.enum(integrationProviders);

export type IntegrationProviderName = z.infer<typeof integrationProviderEnum>;

export const connectOrgIntegrationSchema = z.object({
  provider: integrationProviderEnum,
  externalAccountId: z.string().trim().min(1).optional().nullable(),
  accessToken: z.string().trim().min(1),
  refreshToken: z.string().trim().min(1).optional().nullable(),
  tokenExpiresAt: z.coerce.date().optional().nullable(),
});

export const disconnectOrgIntegrationSchema = z.object({
  provider: integrationProviderEnum,
});
