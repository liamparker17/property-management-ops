import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { ApiError } from '@/lib/errors';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

function readKey(): Buffer {
  const raw = process.env.INTEGRATION_SECRET_KEY?.trim();
  if (!raw) {
    throw ApiError.internal('INTEGRATION_SECRET_KEY is not set');
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, 'hex');
  } catch {
    throw ApiError.internal('INTEGRATION_SECRET_KEY must be a hex string');
  }

  if (key.length !== KEY_BYTES) {
    throw ApiError.internal(
      `INTEGRATION_SECRET_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`,
    );
  }
  return key;
}

export function isCryptoConfigured(): boolean {
  const raw = process.env.INTEGRATION_SECRET_KEY?.trim();
  if (!raw) return false;
  try {
    return Buffer.from(raw, 'hex').length === KEY_BYTES;
  } catch {
    return false;
  }
}

export function encrypt(plaintext: string): string {
  const key = readKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${enc.toString('hex')}`;
}

export function decrypt(cipherText: string): string {
  const key = readKey();
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw ApiError.internal('Malformed ciphertext');
  }
  const [ivHex, authTagHex, dataHex] = parts;
  let iv: Buffer;
  let authTag: Buffer;
  let data: Buffer;
  try {
    iv = Buffer.from(ivHex, 'hex');
    authTag = Buffer.from(authTagHex, 'hex');
    data = Buffer.from(dataHex, 'hex');
  } catch {
    throw ApiError.internal('Malformed ciphertext');
  }

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  try {
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    throw ApiError.internal('Ciphertext authentication failed');
  }
}
