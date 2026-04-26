export { FINANCIAL_YEAR_START } from '@/lib/financial-year';

export function formatZar(cents: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatZarShort(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const rand = Math.abs(cents) / 100;
  if (rand < 1_000) return `${sign}R ${Math.round(rand)}`;
  if (rand < 1_000_000) return `${sign}R ${Math.round(rand / 1_000)}k`;
  const m = rand / 1_000_000;
  if (m < 10) return `${sign}R ${m.toFixed(1)}M`;
  return `${sign}R ${Math.round(m)}M`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}
