import { createHash } from 'node:crypto';

// Slice 1 uses public Vercel Blob URLs. Slice 2+ will move to private blobs + signed URLs.
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { uploadBlob, validateFile } from '@/lib/blob';
import type { RouteCtx } from '@/lib/auth/with-org';
import type { DocumentKind } from '@prisma/client';

export async function uploadLeaseAgreement(ctx: RouteCtx, leaseId: string, file: File) {
  const lease = await db.lease.findFirst({
    where: { id: leaseId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!lease) throw ApiError.notFound('Lease not found');
  try {
    validateFile(file);
  } catch (err) {
    throw ApiError.validation({ file: (err as Error).message });
  }
  const { pathname } = await uploadBlob(`orgs/${ctx.orgId}/leases/${leaseId}/${file.name}`, file);
  const bytes = Buffer.from(await file.arrayBuffer());
  return db.document.create({
    data: {
      orgId: ctx.orgId,
      kind: 'LEASE_AGREEMENT' as DocumentKind,
      leaseId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: pathname,
      checksum: createHash('sha256').update(bytes).digest('hex'),
      encryptionNote: 'provider-default',
      uploadedById: ctx.userId,
    },
  });
}

export async function getDocumentForDownload(ctx: RouteCtx, id: string) {
  const doc = await db.document.findFirst({ where: { id, orgId: ctx.orgId } });
  if (!doc) throw ApiError.notFound('Document not found');
  return doc;
}
