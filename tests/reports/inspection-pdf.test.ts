import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  renderInspectionReport,
  type InspectionReportData,
} from '@/lib/reports/inspection-pdf';

function fixture(): InspectionReportData {
  return {
    inspection: {
      id: 'ins-1',
      type: 'MOVE_IN',
      status: 'SIGNED_OFF',
      scheduledAt: new Date('2026-05-01T09:00:00.000Z'),
      startedAt: new Date('2026-05-01T09:15:00.000Z'),
      completedAt: new Date('2026-05-01T10:45:00.000Z'),
      signedOffAt: new Date('2026-05-01T10:50:00.000Z'),
      summary: 'Move-in inspection completed with minor notes.',
      staffName: 'Jane Staff',
    },
    org: { name: 'Regalis Properties' },
    lease: { id: 'lease-1' },
    unit: { label: 'Unit 3B', propertyName: 'Rosebank Mews' },
    areas: [
      {
        id: 'area-1',
        name: 'Kitchen',
        orderIndex: 0,
        items: [
          {
            id: 'item-1',
            label: 'Walls',
            condition: 'GOOD',
            note: 'Minor scuff near oven',
            estimatedCostCents: 50000,
            responsibility: 'LANDLORD',
            photos: [
              { id: 'ph-1', storageKey: 'inspections/ins-1/ph-1.jpg', caption: 'Scuff' },
              { id: 'ph-2', storageKey: 'inspections/ins-1/ph-2.jpg', caption: null },
            ],
          },
          {
            id: 'item-2',
            label: 'Floor',
            condition: 'EXCELLENT',
            note: null,
            estimatedCostCents: null,
            responsibility: null,
            photos: [],
          },
        ],
      },
      {
        id: 'area-2',
        name: 'Bathroom',
        orderIndex: 1,
        items: [
          {
            id: 'item-3',
            label: 'Shower',
            condition: 'FAIR',
            note: 'Cracked tile',
            estimatedCostCents: 120000,
            responsibility: 'SHARED',
            photos: [
              { id: 'ph-3', storageKey: 'inspections/ins-1/ph-3.jpg', caption: 'Tile' },
            ],
          },
        ],
      },
    ],
    signatures: [
      {
        id: 'sig-1',
        signerRole: 'TENANT',
        signedName: 'Tenant Name',
        signedAt: new Date('2026-05-01T10:48:00.000Z'),
      },
      {
        id: 'sig-2',
        signerRole: 'PROPERTY_MANAGER',
        signedName: 'Staff Name',
        signedAt: new Date('2026-05-01T10:50:00.000Z'),
      },
    ],
  };
}

function hash(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('renderInspectionReport', () => {
  it('is deterministic across repeated renders of the same input', async () => {
    const a = await renderInspectionReport(fixture());
    const b = await renderInspectionReport(fixture());
    assert.equal(hash(a), hash(b));
    assert.ok(a.length > 0);
  });

  it('includes org name, unit, and signature roles in output', async () => {
    const buf = await renderInspectionReport(fixture());
    const html = buf.toString('utf8');
    assert.ok(html.includes('Regalis Properties'));
    assert.ok(html.includes('Unit 3B'));
    assert.ok(html.includes('TENANT'));
    assert.ok(html.includes('PROPERTY_MANAGER'));
  });
});
