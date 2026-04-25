import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KPIS, getKpi } from '@/lib/analytics/kpis';

describe('KPI registry — Phase 1 additions', () => {
  it('exposes NET_RENTAL_INCOME as CENTS with prior-period comparison', () => {
    const kpi = getKpi('NET_RENTAL_INCOME');
    assert.equal(kpi.format, 'CENTS');
    assert.equal(kpi.comparisonMode, 'PRIOR_PERIOD');
    assert.equal(kpi.label, 'Net rental income');
  });

  it('exposes RENT_BILLED and RENT_COLLECTED as CENTS', () => {
    assert.equal(getKpi('RENT_BILLED').format, 'CENTS');
    assert.equal(getKpi('RENT_COLLECTED').format, 'CENTS');
  });

  it('exposes URGENT_MAINTENANCE as COUNT', () => {
    assert.equal(getKpi('URGENT_MAINTENANCE').format, 'COUNT');
  });

  it('drillTarget for NET_RENTAL_INCOME falls through to /dashboard/finance for ADMIN', () => {
    const kpi = getKpi('NET_RENTAL_INCOME');
    assert.equal(kpi.drillTarget({ role: 'ADMIN' }), '/dashboard/finance');
  });

  it('keeps every existing KpiId reachable through KPIS', () => {
    for (const id of [
      'OCCUPANCY_PCT', 'ARREARS_CENTS', 'COLLECTION_RATE', 'TRUST_BALANCE',
      'UNALLOCATED_CENTS', 'OPEN_MAINTENANCE', 'EXPIRING_LEASES_30',
      'BLOCKED_APPROVALS', 'GROSS_RENT', 'DISBURSED_CENTS', 'MAINTENANCE_SPEND',
      'VACANCY_DRAG', 'AGENT_OPEN_TICKETS', 'AGENT_UPCOMING_INSPECTIONS',
    ] as const) {
      assert.ok(KPIS[id], `missing existing KPI ${id}`);
    }
  });
});
