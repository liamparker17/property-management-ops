import { formatZar } from '@/lib/format';

import type { KpiDefinition } from '@/lib/analytics/kpis';

export function formatKpi(value: number, format: KpiDefinition['format']): string {
  if (format === 'CENTS') return formatZar(value);
  if (format === 'PCT') return `${Math.round(value)}%`;
  return new Intl.NumberFormat('en-ZA').format(value);
}
