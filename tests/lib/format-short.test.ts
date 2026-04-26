import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatZarShort } from '@/lib/format';

describe('formatZarShort', () => {
  it('renders <R1k as integer rand', () => {
    assert.equal(formatZarShort(50_000), 'R 500');
    assert.equal(formatZarShort(99_900), 'R 999');
  });
  it('renders R1k..R999k with k', () => {
    assert.equal(formatZarShort(1_000_00), 'R 1k');
    assert.equal(formatZarShort(425_000_00), 'R 425k');
  });
  it('renders R1M..R9.9M with one decimal', () => {
    assert.equal(formatZarShort(1_240_000_00), 'R 1.2M');
    assert.equal(formatZarShort(9_900_000_00), 'R 9.9M');
  });
  it('renders R10M+ with no decimal', () => {
    assert.equal(formatZarShort(12_500_000_00), 'R 13M');
    assert.equal(formatZarShort(92_000_000_00), 'R 92M');
  });
  it('handles negative values', () => {
    assert.equal(formatZarShort(-50_000), '-R 500');
    assert.equal(formatZarShort(-1_240_000_00), '-R 1.2M');
  });
});
