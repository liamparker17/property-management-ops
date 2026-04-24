import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveDrillTarget } from '@/lib/analytics/drill-targets';
import { collectRoutes } from '@/tests/helpers/routes';

const ROUTES = collectRoutes();

describe('analytics drill-target resolver', () => {
  it('preserves scope as query params', () => {
    const target = resolveDrillTarget('TRUST_BALANCE', 'ADMIN', {
      propertyId: 'prop-1',
      landlordId: 'landlord-1',
      agentId: 'agent-1',
    });

    assert.equal(
      target,
      '/dashboard/finance?propertyId=prop-1&landlordId=landlord-1&agentId=agent-1',
    );
  });

  it('returns existing base routes for every role', () => {
    const roles = ['ADMIN', 'LANDLORD', 'MANAGING_AGENT', 'TENANT'] as const;
    const ids = ['OCCUPANCY_PCT', 'OPEN_MAINTENANCE', 'TRUST_BALANCE', 'AGENT_UPCOMING_INSPECTIONS'] as const;

    for (const role of roles) {
      for (const id of ids) {
        const target = resolveDrillTarget(id, role);
        assert.ok(ROUTES.has(target), `Expected ${id}/${role} route ${target} to exist`);
      }
    }
  });
});
