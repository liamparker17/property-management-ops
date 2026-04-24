import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  generateLandlordPackSchema,
  generateTenantPackSchema,
  regeneratePackSchema,
} from '@/lib/zod/tax-pack';

describe('tax-pack zod schemas', () => {
  it('parses landlord generation input', () => {
    const parsed = generateLandlordPackSchema.parse({
      landlordId: 'cma1111111111111111111111',
      yearId: 'cma2222222222222222222222',
      transmissionAdapter: 'sars',
    });
    assert.equal(parsed.transmissionAdapter, 'sars');
  });

  it('allows unknown adapter names through parsing', () => {
    const parsed = generateTenantPackSchema.parse({
      tenantId: 'cma3333333333333333333333',
      yearId: 'cma4444444444444444444444',
      transmissionAdapter: 'future-adapter',
    });
    assert.equal(parsed.transmissionAdapter, 'future-adapter');
  });

  it('rejects invalid pack ids', () => {
    assert.throws(() => regeneratePackSchema.parse({ packId: 'not-a-cuid' }));
  });
});
