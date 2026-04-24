export const FINANCIAL_YEAR_START = { month: 3, day: 1 } as const;

export type FinancialYearWindow = {
  startDate: Date;
  endDate: Date;
};

function startOfUtcDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0));
}

function endOfUtcDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999));
}

function financialYearStartForYear(year: number): Date {
  return startOfUtcDay(year, FINANCIAL_YEAR_START.month - 1, FINANCIAL_YEAR_START.day);
}

export function resolveFinancialYearForDate(date: Date): FinancialYearWindow {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    throw new Error('Invalid date');
  }

  const currentYearStart = financialYearStartForYear(value.getUTCFullYear());
  const startYear =
    value.getTime() >= currentYearStart.getTime()
      ? value.getUTCFullYear()
      : value.getUTCFullYear() - 1;

  return {
    startDate: financialYearStartForYear(startYear),
    endDate: endOfUtcDay(startYear + 1, FINANCIAL_YEAR_START.month - 1, FINANCIAL_YEAR_START.day - 1),
  };
}

export function currentFinancialYear(now: Date = new Date()): FinancialYearWindow {
  return resolveFinancialYearForDate(now);
}

export function previousFinancialYear(now: Date = new Date()): FinancialYearWindow {
  const current = resolveFinancialYearForDate(now);
  return {
    startDate: financialYearStartForYear(current.startDate.getUTCFullYear() - 1),
    endDate: endOfUtcDay(
      current.startDate.getUTCFullYear(),
      FINANCIAL_YEAR_START.month - 1,
      FINANCIAL_YEAR_START.day - 1,
    ),
  };
}

export function formatFinancialYearLabel(startDate: Date): string {
  const year = startDate.getUTCFullYear();
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
}

export function isDateWithinFinancialYear(
  date: Date,
  year: FinancialYearWindow,
): boolean {
  const value = new Date(date);
  return value.getTime() >= year.startDate.getTime() && value.getTime() <= year.endDate.getTime();
}
