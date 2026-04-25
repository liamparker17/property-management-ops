import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { Sparkline, sparklinePathD } from '@/components/analytics/sparkline';

describe('sparklinePathD', () => {
  it('returns empty string for empty series', () => {
    assert.equal(sparklinePathD([], 100, 30), '');
  });

  it('renders flat line at vertical centre when all values equal', () => {
    const d = sparklinePathD([5, 5, 5, 5], 100, 30);
    assert.match(d, /M 0 15 L 33\.33 15 L 66\.67 15 L 100 15/);
  });

  it('rises from bottom-left to top-right for ascending series', () => {
    const d = sparklinePathD([0, 1, 2, 3], 100, 30);
    assert.match(d, /^M 0 30/);
    assert.match(d, /L 100 0$/);
  });
});

describe('<Sparkline />', () => {
  it('renders an svg with class and an inline gradient when series is non-empty', () => {
    const html = renderToString(<Sparkline series={[1, 2, 3, 4]} />);
    assert.match(html, /<svg[^>]*class=/);
    assert.match(html, /<linearGradient/);
    assert.match(html, /<path[^>]*d="/);
  });

  it('renders nothing visible when series is empty', () => {
    const html = renderToString(<Sparkline series={[]} />);
    assert.match(html, /<svg/);
    assert.doesNotMatch(html, /<path/);
  });
});
