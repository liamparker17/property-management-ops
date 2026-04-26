import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { healthBandColor, HEALTH_BAND_HEX } from '@/lib/analytics/health-band';

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

describe('HEALTH_BAND_HEX', () => {
  it('has a hex value for every band', () => {
    assert.ok(HEALTH_BAND_HEX.green.startsWith('#'));
    assert.ok(HEALTH_BAND_HEX.gold.startsWith('#'));
    assert.ok(HEALTH_BAND_HEX.orange.startsWith('#'));
    assert.ok(HEALTH_BAND_HEX.red.startsWith('#'));
    assert.ok(HEALTH_BAND_HEX.neutral.startsWith('#'));
  });
});
