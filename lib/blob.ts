import { put, del } from '@vercel/blob';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

export function validateFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error('File too large (max 20MB)');
  if (!ALLOWED_MIME.has(file.type)) throw new Error(`Unsupported file type: ${file.type}`);
}

export async function uploadBlob(path: string, file: File) {
  const result = await put(path, file, { access: 'public', addRandomSuffix: true, contentType: file.type });
  return { url: result.url, pathname: result.pathname };
}

export async function deleteBlob(pathname: string) {
  await del(pathname);
}
