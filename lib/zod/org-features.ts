import { z } from 'zod';

export const featureFlagKeys = [
  'UTILITIES_BILLING',
  'TRUST_ACCOUNTING',
  'AREA_NOTICES',
  'LANDLORD_APPROVALS',
  'USAGE_ALERTS',
  'PAYMENT_ALERTS',
  'ANNUAL_PACKS',
] as const;

export const featureFlagKeyEnum = z.enum(featureFlagKeys);

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export type FeatureFlagKey = z.infer<typeof featureFlagKeyEnum>;
export type JsonConfig = Exclude<JsonValue, null>;

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const jsonConfigSchema: z.ZodType<JsonConfig> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const setOrgFeatureSchema = z.object({
  key: featureFlagKeyEnum,
  enabled: z.boolean(),
  config: jsonConfigSchema.optional(),
});
