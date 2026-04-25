import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { AgingBar, type AgingSegment } from '@/components/analytics/charts/aging-bar';

const segments: AgingSegment[] = [
  { id: '0-30', label: '0–30', cents: 50_000_00 },
  { id: '31-60', label: '31–60', cents: 30_000_00 },
  { id: '61-90', label: '61–90', cents: 15_000_00 },
  { id: '90+', label: '90+', cents: 5_000_00 },
];

describe('<AgingBar />', () => {
  it('renders segments with widths proportional to amounts', () => {
    const html = renderToString(<AgingBar segments={segments} />);
    assert.match(html, /50%/, 'first segment is half of total');
    assert.match(html, /30%/);
    assert.match(html, /15%/);
    assert.match(html, /5%/);
  });

  it('renders an empty-state when total is zero', () => {
    const empty = segments.map((s) => ({ ...s, cents: 0 }));
    const html = renderToString(<AgingBar segments={empty} />);
    assert.match(html, /No arrears/);
  });

  it('shows segment labels and ZAR amounts in the legend', () => {
    const html = renderToString(<AgingBar segments={segments} />);
    assert.match(html, /0–30/);
    assert.match(html, /R\s?5\s?000/);
  });
});
