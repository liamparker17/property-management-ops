import type { DrillId } from '@/lib/zod/analytics-drill';
import { drillIdSchema } from '@/lib/zod/analytics-drill';

export const DRILL_IDS = drillIdSchema.options;

export function isDrillId(value: unknown): value is DrillId {
  return drillIdSchema.safeParse(value).success;
}
