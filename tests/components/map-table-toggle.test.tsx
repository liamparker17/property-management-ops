import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { MapTableToggle } from '@/components/analytics/map-table-toggle';

describe('<MapTableToggle />', () => {
  it('renders both Map and Table buttons', () => {
    const html = renderToString(<MapTableToggle current="map" />);
    assert.match(html, /Map/);
    assert.match(html, /Table/);
  });
});
