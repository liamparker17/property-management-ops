// healthBandColor is now in lib/analytics/health-band — see tests/lib/analytics-health-band.test.ts
// This file keeps a minimal smoke test verifying the re-export from portfolio-pins still works.
import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';

// Stub browser-only modules so the re-exported healthBandColor can be imported.
mock.module('leaflet', { namedExports: { divIcon: () => ({}) } });
mock.module('react-leaflet', {
  namedExports: {
    MapContainer: () => null,
    Marker: () => null,
    Popup: () => null,
    TileLayer: () => null,
    useMap: () => ({}),
  },
});

let healthBandColor: (score: number | null | undefined) => string;

before(async () => {
  const mod = await import('@/components/analytics/maps/portfolio-pins');
  healthBandColor = mod.healthBandColor;
});

describe('portfolio-pins re-export: healthBandColor', () => {
  it('still resolves green / red / neutral via re-export', () => {
    assert.equal(healthBandColor(80), 'green');
    assert.equal(healthBandColor(20), 'red');
    assert.equal(healthBandColor(null), 'neutral');
  });
});
