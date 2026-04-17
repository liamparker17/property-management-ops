import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';
import { getDocumentForDownload } from '@/lib/services/documents';
import { getTenantDocumentForDownload } from '@/lib/services/tenant-portal';

type Params = { id: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  try {
    const session = await auth();
    if (!session?.user) throw ApiError.unauthorized();
    const { id } = await ctx.params;

    const doc =
      session.user.role === 'TENANT'
        ? await getTenantDocumentForDownload(session.user.id, id)
        : await getDocumentForDownload(
            { orgId: session.user.orgId, userId: session.user.id, role: session.user.role },
            id,
          );

    const url = `https://${process.env.BLOB_PUBLIC_HOST ?? 'blob.vercel-storage.com'}/${doc.storageKey}`;
    return NextResponse.redirect(url, 302);
  } catch (err) {
    return toErrorResponse(err);
  }
}
