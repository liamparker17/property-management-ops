import { z } from 'zod';

export const drillIdSchema = z.enum([
  'arrears-aging',
  'top-overdue',
  'lease-expiries',
  'urgent-maintenance',
]);

export type DrillId = z.infer<typeof drillIdSchema>;
