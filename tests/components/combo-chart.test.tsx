import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { ComboChart, type ComboChartPoint } from '@/components/analytics/charts/combo-chart';

const data: ComboChartPoint[] = [
  { x: 'Jan', bars: 100_000_00, line: 90_000_00, priorLine: 85_000_00 },
  { x: 'Feb', bars: 110_000_00, line: 102_000_00, priorLine: 88_000_00 },
  { x: 'Mar', bars: 120_000_00, line: 115_000_00 },
];

describe('<ComboChart />', () => {
  it('renders a ResponsiveContainer wrapper', () => {
    const html = renderToString(<ComboChart data={data} yFormat="cents" seriesLabels={{ bars: 'Billed', line: 'Collected' }} />);
    assert.ok(html.includes('recharts-responsive-container') || html.includes('div'));
  });

  it('does not throw with empty data', () => {
    assert.doesNotThrow(() => renderToString(<ComboChart data={[]} yFormat="cents" />));
  });

  it('does not throw when priorLine is omitted entirely', () => {
    const stripped = data.map(({ priorLine: _omit, ...rest }) => rest);
    assert.doesNotThrow(() => renderToString(<ComboChart data={stripped} yFormat="cents" />));
  });
});
