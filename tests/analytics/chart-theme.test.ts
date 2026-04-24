import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chartTheme, getSeriesPalette } from '@/lib/analytics/chart-theme';

describe('chart theme registry', () => {
  it('exposes the required theme keys', () => {
    assert.equal(typeof chartTheme.surface, 'string');
    assert.equal(typeof chartTheme.gridStroke, 'string');
    assert.equal(typeof chartTheme.axisStroke, 'string');
    assert.equal(typeof chartTheme.tooltipSurface, 'string');
    assert.equal(typeof chartTheme.fonts.value, 'string');
    assert.equal(typeof chartTheme.seriesF, 'string');
  });

  it('returns a stable series palette length', () => {
    assert.deepEqual(getSeriesPalette(0), []);
    assert.equal(getSeriesPalette(3).length, 3);
    assert.equal(getSeriesPalette(8).length, 8);
    assert.equal(getSeriesPalette(1)[0], getSeriesPalette(7)[0]);
  });
});
