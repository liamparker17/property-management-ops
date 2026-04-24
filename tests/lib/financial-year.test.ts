import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  currentFinancialYear,
  formatFinancialYearLabel,
  isDateWithinFinancialYear,
  previousFinancialYear,
  resolveFinancialYearForDate,
} from '@/lib/financial-year';

describe('financial-year helpers', () => {
  it('resolves 2026-02-15 into the 2025/26 year', () => {
    const year = resolveFinancialYearForDate(new Date('2026-02-15T12:00:00.000Z'));
    assert.equal(year.startDate.toISOString(), '2025-03-01T00:00:00.000Z');
    assert.equal(year.endDate.toISOString(), '2026-02-28T23:59:59.999Z');
    assert.equal(formatFinancialYearLabel(year.startDate), '2025/26');
  });

  it('resolves 2026-03-01 into the 2026/27 year', () => {
    const year = resolveFinancialYearForDate(new Date('2026-03-01T00:00:00.000Z'));
    assert.equal(year.startDate.toISOString(), '2026-03-01T00:00:00.000Z');
    assert.equal(year.endDate.toISOString(), '2027-02-28T23:59:59.999Z');
  });

  it('treats leap-year 2028-02-29 as inside 2027/28', () => {
    const year = resolveFinancialYearForDate(new Date('2028-02-29T10:00:00.000Z'));
    assert.equal(year.startDate.toISOString(), '2027-03-01T00:00:00.000Z');
    assert.equal(year.endDate.toISOString(), '2028-02-29T23:59:59.999Z');
    assert.equal(isDateWithinFinancialYear(new Date('2028-02-29T23:59:59.000Z'), year), true);
  });

  it('keeps previousFinancialYear symmetric with currentFinancialYear', () => {
    const current = currentFinancialYear(new Date('2026-08-20T00:00:00.000Z'));
    const previous = previousFinancialYear(new Date('2026-08-20T00:00:00.000Z'));
    assert.equal(current.startDate.toISOString(), '2026-03-01T00:00:00.000Z');
    assert.equal(previous.startDate.toISOString(), '2025-03-01T00:00:00.000Z');
    assert.equal(previous.endDate.toISOString(), '2026-02-28T23:59:59.999Z');
  });
});
