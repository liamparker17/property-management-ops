import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { KpiTile } from '@/components/analytics/kpi-tile';

describe('<KpiTile />', () => {
  it('renders without sparkline when series is omitted', () => {
    const html = renderToString(
      <KpiTile kpiId="OCCUPANCY_PCT" value={92} />,
    );
    assert.match(html, /Occupancy/);
    assert.doesNotMatch(html, /<svg/);
  });

  it('renders an inline svg sparkline when series is provided', () => {
    const html = renderToString(
      <KpiTile kpiId="OCCUPANCY_PCT" value={92} series={[88, 89, 90, 91, 92]} />,
    );
    assert.match(html, /<svg/);
    assert.match(html, /<path/);
  });
});
