import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSignedUploadUrl } from '@/lib/blob';

describe('createSignedUploadUrl', () => {
  it('produces an org-scoped storageKey under the supplied pathname', () => {
    const result = createSignedUploadUrl({
      pathname: 'inspections/org-1/item-abc',
      contentType: 'image/jpeg',
    });
    assert.match(result.storageKey, /^inspections\/org-1\/item-abc\/[0-9a-f]{12}\.jpg$/);
    assert.equal(result.uploadUrl.startsWith('/api/uploads/blob/'), true);
    assert.equal(result.publicUrl.endsWith(result.storageKey), true);
  });

  function detailField(fn: () => unknown, field: string): string[] | undefined {
    try {
      fn();
    } catch (err) {
      const details = (err as { details?: Record<string, string[]> }).details;
      return details?.[field];
    }
    return undefined;
  }

  it('rejects unsupported content types', () => {
    const d = detailField(
      () => createSignedUploadUrl({ pathname: 'inspections/org-1/item-x', contentType: 'application/pdf' }),
      'contentType',
    );
    assert.ok(d && d[0].includes('Unsupported content type'));
  });

  it('rejects pathnames with traversal segments', () => {
    const d = detailField(
      () => createSignedUploadUrl({ pathname: '../escape', contentType: 'image/png' }),
      'pathname',
    );
    assert.deepEqual(d, ['Invalid pathname']);
  });

  it('rejects pathnames starting with /', () => {
    const d = detailField(
      () => createSignedUploadUrl({ pathname: '/inspections/org-1', contentType: 'image/png' }),
      'pathname',
    );
    assert.deepEqual(d, ['Invalid pathname']);
  });

  it('rejects maxBytes above the global cap', () => {
    const d = detailField(
      () => createSignedUploadUrl({
        pathname: 'inspections/org-1/item',
        contentType: 'image/png',
        maxBytes: 100 * 1024 * 1024,
      }),
      'maxBytes',
    );
    assert.ok(d && d[0].includes('Cannot exceed'));
  });

  it('uses the right extension per content type', () => {
    const png = createSignedUploadUrl({ pathname: 'inspections/o/i', contentType: 'image/png' });
    const webp = createSignedUploadUrl({ pathname: 'inspections/o/i', contentType: 'image/webp' });
    assert.equal(png.storageKey.endsWith('.png'), true);
    assert.equal(webp.storageKey.endsWith('.webp'), true);
  });
});
