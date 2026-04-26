import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToString } from 'react-dom/server';

import { ArrearsAgingDrill } from '@/components/analytics/drill/arrears-aging-drill';
import { TopOverdueDrill } from '@/components/analytics/drill/top-overdue-drill';
import { LeaseExpiriesDrill } from '@/components/analytics/drill/lease-expiries-drill';
import { UrgentMaintenanceDrill } from '@/components/analytics/drill/urgent-maintenance-drill';

describe('drill renderers', () => {
  it('ArrearsAgingDrill renders a table per bucket', () => {
    const html = renderToString(<ArrearsAgingDrill data={{ buckets: [
      { id: '0-30', label: '0–30 days', rows: [{ id: 'i1', tenant: 'Alice', property: 'A', unit: '1', cents: 10_000_00, dueDate: new Date(), ageDays: 5 }] },
      { id: '31-60', label: '31–60 days', rows: [] },
      { id: '61-90', label: '61–90 days', rows: [] },
      { id: '90+', label: '90+ days', rows: [] },
    ] }} />);
    assert.match(html, /0–30 days/);
    assert.match(html, /Alice/);
  });
  it('TopOverdueDrill renders an unbounded table', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, tenant: `T${i}`, property: 'A', unit: '1', cents: 1000, dueDate: new Date(), ageDays: 10 }));
    const html = renderToString(<TopOverdueDrill data={{ rows }} />);
    for (let i = 0; i < 12; i += 1) assert.match(html, new RegExp(`T${i}\\b`));
  });
  it('LeaseExpiriesDrill renders a table per bucket', () => {
    const html = renderToString(<LeaseExpiriesDrill data={{ buckets: [
      { id: '0-30', label: '0–30 days', rows: [{ id: 'l1', tenant: 'Alice', property: 'A', unit: '1', endDate: new Date(), daysUntilExpiry: 10 }] },
      { id: '31-60', label: '31–60 days', rows: [] },
      { id: '61-90', label: '61–90 days', rows: [] },
      { id: '90+', label: '90+ days', rows: [] },
    ] }} />);
    assert.match(html, /Alice/);
  });
  it('UrgentMaintenanceDrill renders priority + age columns', () => {
    const html = renderToString(<UrgentMaintenanceDrill data={{ rows: [
      { id: 'm1', title: 'Burst geyser', priority: 'URGENT', status: 'OPEN', property: 'A', unit: '1', vendorName: null, ageDays: 2, scheduledFor: null },
    ] }} />);
    assert.match(html, /URGENT/);
    assert.match(html, /Burst geyser/);
  });
});
