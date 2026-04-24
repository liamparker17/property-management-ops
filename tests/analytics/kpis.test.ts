import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KPIS, type KpiId, getKpi } from '@/lib/analytics/kpis';
import { collectRoutes } from '@/tests/helpers/routes';

const ROUTES = collectRoutes();
const KPI_IDS: KpiId[] = [
  'OCCUPANCY_PCT',
  'ARREARS_CENTS',
  'COLLECTION_RATE',
  'TRUST_BALANCE',
  'UNALLOCATED_CENTS',
  'OPEN_MAINTENANCE',
  'EXPIRING_LEASES_30',
  'BLOCKED_APPROVALS',
  'GROSS_RENT',
  'DISBURSED_CENTS',
  'MAINTENANCE_SPEND',
  'VACANCY_DRAG',
  'AGENT_OPEN_TICKETS',
  'AGENT_UPCOMING_INSPECTIONS',
];

describe('analytics KPI registry', () => {
  it('defines every KPI id exactly once', () => {
    assert.deepEqual(Object.keys(KPIS).sort(), KPI_IDS.slice().sort());
    for (const id of KPI_IDS) {
      assert.equal(getKpi(id).id, id);
    }
  });

  it('returns drill targets that point to existing routes', () => {
    const roles = ['ADMIN', 'LANDLORD', 'MANAGING_AGENT', 'TENANT'] as const;

    for (const id of KPI_IDS) {
      for (const role of roles) {
        const target = getKpi(id).drillTarget({ role });
        assert.ok(
          ROUTES.has(target),
          `Expected ${id}/${role} target ${target} to exist in app routes`,
        );
      }
    }
  });
});
