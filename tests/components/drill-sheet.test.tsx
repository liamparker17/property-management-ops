import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { DrillSheet } from '@/components/analytics/drill-sheet';

describe('<DrillSheet />', () => {
  it('renders title and a close button', () => {
    const html = renderToString(
      <DrillSheet title="Arrears aging detail" csvHref="/api/analytics/drill/arrears-aging/export.csv">
        <div>content</div>
      </DrillSheet>,
    );
    assert.match(html, /Arrears aging detail/);
    assert.match(html, /Close/i);
    assert.match(html, /export\.csv/);
  });

  it('renders without CSV link when csvHref is omitted', () => {
    const html = renderToString(
      <DrillSheet title="Generic">
        <div>x</div>
      </DrillSheet>,
    );
    assert.doesNotMatch(html, /export\.csv/);
  });
});
