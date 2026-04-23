import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, describe, it } from 'node:test';

let encrypt: (plain: string) => string;
let decrypt: (cipher: string) => string;
let isCryptoConfigured: () => boolean;

const originalKey = process.env.INTEGRATION_SECRET_KEY;

before(async () => {
  process.env.INTEGRATION_SECRET_KEY = randomBytes(32).toString('hex');
  const mod = (await import('@/lib/crypto')) as any;
  ({ encrypt, decrypt, isCryptoConfigured } = mod);
});

after(() => {
  if (originalKey === undefined) {
    delete process.env.INTEGRATION_SECRET_KEY;
  } else {
    process.env.INTEGRATION_SECRET_KEY = originalKey;
  }
});

describe('lib/crypto', () => {
  it('round-trips a plaintext through encrypt + decrypt', () => {
    const plain = 'super-secret-access-token-abc123';
    const ct = encrypt(plain);
    assert.notEqual(ct, plain);
    assert.equal(decrypt(ct), plain);
  });

  it('produces a different ciphertext for the same plaintext (random IV)', () => {
    const plain = 'same-input';
    assert.notEqual(encrypt(plain), encrypt(plain));
  });

  it('detects tampering with the ciphertext via auth tag', () => {
    const ct = encrypt('hello world');
    const [iv, tag, data] = ct.split(':');
    const flipped = data.slice(0, -2) + (data.endsWith('00') ? 'ff' : '00');
    const tampered = `${iv}:${tag}:${flipped}`;
    assert.throws(() => decrypt(tampered), { code: 'INTERNAL' });
  });

  it('throws on malformed ciphertext', () => {
    assert.throws(() => decrypt('not-a-valid-cipher'), { code: 'INTERNAL' });
  });

  it('reports the crypto module as configured when key is set', () => {
    assert.equal(isCryptoConfigured(), true);
  });

  it('reports not-configured when key is missing', () => {
    const prev = process.env.INTEGRATION_SECRET_KEY;
    delete process.env.INTEGRATION_SECRET_KEY;
    try {
      assert.equal(isCryptoConfigured(), false);
    } finally {
      process.env.INTEGRATION_SECRET_KEY = prev;
    }
  });
});
