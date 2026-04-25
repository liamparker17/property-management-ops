import type { RouteCtx } from '@/lib/auth/with-org';
import { analyticsSearchParamsSchema } from '@/lib/zod/analytics';

export type DateRange = { from: Date; to: Date };
export type CompareMode = 'prior' | 'yoy' | 'off';
export type Scope = {
  propertyIds?: string[];
  landlordIds?: string[];
  agentIds?: string[];
};

export type AnalyticsCtx = RouteCtx & {
  range: DateRange;
  compare: CompareMode;
  scope: Scope;
};

function monthFloorUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function rangeFromPreset(preset: '1m' | '3m' | '12m' | 'ytd', now: Date): DateRange {
  const to = monthFloorUtc(now);
  if (preset === '1m') return { from: to, to };
  if (preset === '3m') return { from: addMonthsUtc(to, -2), to };
  if (preset === '12m') return { from: addMonthsUtc(to, -11), to };
  const ytdFrom = new Date(Date.UTC(to.getUTCFullYear(), 0, 1));
  return { from: ytdFrom, to };
}

function csvList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function resolveAnalyticsCtx(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  base: RouteCtx,
): AnalyticsCtx {
  const raw =
    searchParams instanceof URLSearchParams
      ? Object.fromEntries(searchParams.entries())
      : Object.fromEntries(
          Object.entries(searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        );
  const parsed = analyticsSearchParamsSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};
  const now = new Date();

  let range: DateRange;
  if (data.from && data.to) {
    range = { from: new Date(`${data.from}T00:00:00Z`), to: new Date(`${data.to}T00:00:00Z`) };
  } else if (data.range && ['1m', '3m', '12m', 'ytd'].includes(data.range)) {
    range = rangeFromPreset(data.range as '1m' | '3m' | '12m' | 'ytd', now);
  } else {
    range = rangeFromPreset('12m', now);
  }

  const scope: Scope = {};
  const propertyIds = csvList(data.properties);
  if (propertyIds) scope.propertyIds = propertyIds;
  const landlordIds = csvList(data.landlords);
  if (landlordIds) scope.landlordIds = landlordIds;
  const agentIds = csvList(data.agents);
  if (agentIds) scope.agentIds = agentIds;

  return {
    ...base,
    range,
    compare: data.compare ?? 'prior',
    scope,
  };
}
