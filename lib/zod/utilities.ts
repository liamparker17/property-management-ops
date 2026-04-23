import { z } from 'zod';

export const utilityTypeEnum = z.enum(['WATER', 'ELECTRICITY', 'GAS', 'SEWER', 'REFUSE', 'OTHER']);
export const meterReadingSourceEnum = z.enum(['MANUAL', 'IMPORT', 'ESTIMATED', 'ROLLOVER']);
export const tariffStructureEnum = z.enum(['FLAT', 'TIERED']);

export const createMeterSchema = z.object({
  unitId: z.string().min(1),
  type: utilityTypeEnum,
  serial: z.string().trim().max(120).optional().nullable(),
  installedAt: z.string().datetime().optional().nullable(),
});

export const recordMeterReadingSchema = z.object({
  meterId: z.string().min(1),
  takenAt: z.string().datetime(),
  readingValue: z.union([z.number(), z.string()]).transform((v) => String(v)),
  source: meterReadingSourceEnum.default('MANUAL'),
});

const tieredRow = z.object({
  uptoQty: z.number().nonnegative(),
  unitRateCents: z.number().int().nonnegative(),
});

export const upsertUtilityTariffSchema = z
  .object({
    id: z.string().optional(),
    propertyId: z.string().nullable().optional(),
    type: utilityTypeEnum,
    structure: tariffStructureEnum,
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().optional().nullable(),
    flatUnitRateCents: z.number().int().nonnegative().optional().nullable(),
    tieredJson: z.array(tieredRow).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.structure === 'FLAT' && val.flatUnitRateCents == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['flatUnitRateCents'],
        message: 'flatUnitRateCents is required for FLAT tariffs',
      });
    }
    if (val.structure === 'TIERED' && (!val.tieredJson || val.tieredJson.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['tieredJson'],
        message: 'tieredJson must include at least one tier for TIERED tariffs',
      });
    }
  });
