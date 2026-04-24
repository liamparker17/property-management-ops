import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { EmptyMetric } from '@/components/analytics/empty-metric';
import { KpiTile } from '@/components/analytics/kpi-tile';
import { RankedList } from '@/components/analytics/ranked-list';
import { StatusStrip } from '@/components/analytics/status-strip';

describe('analytics components', () => {
  it('renders KPI tile content', () => {
    const markup = renderToStaticMarkup(
      <KpiTile kpiId="TRUST_BALANCE" value={125000} prior={100000} />,
    );

    assert.match(markup, /Trust Balance/);
    assert.match(markup, /View detail/);
  });

  it('renders ranked list rows and empty metric copy', () => {
    const ranked = renderToStaticMarkup(
      <RankedList
        title="Top Arrears"
        items={[{ id: '1', title: 'Rosebank', subtitle: 'Unit 4', value: 'R 5,000' }]}
      />,
    );
    const empty = renderToStaticMarkup(
      <EmptyMetric title="No Data" description="Nothing is missing." />,
    );

    assert.match(ranked, /Top Arrears/);
    assert.match(ranked, /Rosebank/);
    assert.match(empty, /Nothing is missing/);
  });

  it('renders status strip values', () => {
    const markup = renderToStaticMarkup(
      <StatusStrip
        items={[
          { id: 'open', label: 'Open', value: '12' },
          { id: 'urgent', label: 'Urgent', value: '3', tone: 'alert' },
        ]}
      />,
    );

    assert.match(markup, /Open/);
    assert.match(markup, /Urgent/);
    assert.match(markup, />12</);
  });
});
