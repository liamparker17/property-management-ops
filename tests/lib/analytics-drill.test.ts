import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DRILL_IDS, isDrillId } from '@/lib/analytics/drill';
import { drillIdSchema } from '@/lib/zod/analytics-drill';

describe('drill ids', () => {
  it('exposes the 4 phase-2b drill ids', () => {
    assert.deepEqual([...DRILL_IDS].sort(), ['arrears-aging', 'lease-expiries', 'top-overdue', 'urgent-maintenance']);
  });
  it('isDrillId narrows to a known id', () => {
    assert.ok(isDrillId('arrears-aging'));
    assert.equal(isDrillId('not-real'), false);
    assert.equal(isDrillId(undefined), false);
  });
  it('drillIdSchema parses known ids and rejects others', () => {
    assert.equal(drillIdSchema.parse('top-overdue'), 'top-overdue');
    assert.throws(() => drillIdSchema.parse('zzz'));
  });
});
