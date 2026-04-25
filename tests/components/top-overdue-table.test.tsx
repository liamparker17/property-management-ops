import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { TopOverdueTable, type TopOverdueRow } from '@/components/analytics/top-overdue-table';

const rows: TopOverdueRow[] = [
  { id: 'a', title: 'Acme / 12B', subtitle: 'Alice Tenant', amountCents: 100_000_00, fraction: 1, href: '/leases/a' },
  { id: 'b', title: 'Beta / 5A',  subtitle: 'Bob Tenant',   amountCents: 50_000_00,  fraction: 0.5, href: '/leases/b' },
];

describe('<TopOverdueTable />', () => {
  it('renders one <tr> per row and a mini-bar element with proportional width', () => {
    const html = renderToString(<TopOverdueTable rows={rows} />);
    assert.match(html, /<tr/);
    assert.match(html, /Acme \/ 12B/);
    assert.match(html, /Beta \/ 5A/);
    assert.match(html, /width:\s*100%/);
    assert.match(html, /width:\s*50%/);
  });

  it('renders an empty-state when rows is empty', () => {
    const html = renderToString(<TopOverdueTable rows={[]} />);
    assert.match(html, /No overdue/i);
  });
});
