import assert from 'node:assert/strict';
import { before, describe, it, mock } from 'node:test';

// Stub browser-only modules so the pure healthBandColor logic can run in Node.
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

describe('healthBandColor', () => {
  it('returns green for score >= 80', () => {
    assert.equal(healthBandColor(85), 'green');
    assert.equal(healthBandColor(80), 'green');
  });
  it('returns gold for 60..79', () => {
    assert.equal(healthBandColor(75), 'gold');
    assert.equal(healthBandColor(60), 'gold');
  });
  it('returns orange for 40..59', () => {
    assert.equal(healthBandColor(50), 'orange');
    assert.equal(healthBandColor(40), 'orange');
  });
  it('returns red for < 40', () => {
    assert.equal(healthBandColor(39), 'red');
    assert.equal(healthBandColor(0), 'red');
  });
  it('returns neutral for null / undefined', () => {
    assert.equal(healthBandColor(null), 'neutral');
    assert.equal(healthBandColor(undefined), 'neutral');
  });
});
