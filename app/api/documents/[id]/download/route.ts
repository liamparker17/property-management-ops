import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { getDocumentForDownload } from '@/lib/services/documents';

type Params = { id: string };

export const GET = withOrg<Params>(async (_req, ctx, { id }) => {
  const doc = await getDocumentForDownload(ctx, id);
  const url = `https://${process.env.BLOB_PUBLIC_HOST ?? 'blob.vercel-storage.com'}/${doc.storageKey}`;
  return NextResponse.redirect(url, 302);
});
