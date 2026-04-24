import { put, del } from '@vercel/blob';
import { randomBytes } from 'node:crypto';

import { ApiError } from '@/lib/errors';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const PHOTO_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function validateFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error('File too large (max 20MB)');
  if (!ALLOWED_MIME.has(file.type)) throw new Error(`Unsupported file type: ${file.type}`);
}

export async function uploadBlob(
  path: string,
  file: File,
  opts?: { addRandomSuffix?: boolean; access?: 'public' | 'private' },
) {
  const result = await put(path, file, {
    access: opts?.access ?? 'public',
    addRandomSuffix: opts?.addRandomSuffix ?? true,
    contentType: file.type,
  });
  return { url: result.url, pathname: result.pathname };
}

export async function deleteBlob(pathname: string) {
  await del(pathname);
}

export type SignedUploadInput = {
  pathname: string;
  contentType: string;
  maxBytes?: number;
};

export type SignedUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  storageKey: string;
};

// Internal proxy route accepts the multipart upload and forwards to Vercel Blob via uploadBlob.
// Production deployments may swap uploadUrl for a Vercel Blob client-token URL via @vercel/blob/client.
const UPLOAD_PROXY_PATH = '/api/uploads/blob';
const PUBLIC_BASE = process.env.BLOB_PUBLIC_BASE_URL ?? 'https://blob.vercel-storage.com';

export function createSignedUploadUrl(input: SignedUploadInput): SignedUploadResult {
  const { pathname, contentType } = input;
  const cap = input.maxBytes ?? MAX_BYTES;

  if (!pathname || pathname.includes('..') || pathname.startsWith('/')) {
    throw ApiError.validation({ pathname: ['Invalid pathname'] });
  }
  if (cap > MAX_BYTES) {
    throw ApiError.validation({ maxBytes: [`Cannot exceed ${MAX_BYTES} bytes`] });
  }
  if (!PHOTO_MIME.has(contentType)) {
    throw ApiError.validation({ contentType: [`Unsupported content type: ${contentType}`] });
  }

  const suffix = randomBytes(6).toString('hex');
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const storageKey = `${pathname}/${suffix}.${ext}`;
  const uploadUrl = `${UPLOAD_PROXY_PATH}/${encodeURIComponent(storageKey)}`;
  const publicUrl = `${PUBLIC_BASE}/${storageKey}`;

  return { uploadUrl, publicUrl, storageKey };
}
