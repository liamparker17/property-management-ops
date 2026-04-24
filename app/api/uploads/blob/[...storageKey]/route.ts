import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { ApiError, toErrorResponse } from '@/lib/errors';
import { uploadBlob } from '@/lib/blob';

type Params = { storageKey: string[] };

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function PUT(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const session = await auth();
    if (!session?.user) throw ApiError.unauthorized();

    const { storageKey } = await ctx.params;
    const pathname = storageKey.map((s) => decodeURIComponent(s)).join('/');
    const expectedOrgPrefix = `inspections/${session.user.orgId}/`;
    if (!pathname.startsWith(expectedOrgPrefix)) throw ApiError.forbidden('Pathname not in this org scope');

    const contentType = req.headers.get('content-type') ?? 'application/octet-stream';
    if (!ALLOWED_MIME.has(contentType)) {
      throw ApiError.validation({ contentType: [`Unsupported content type: ${contentType}`] });
    }

    const blob = await req.blob();
    const file = new File([blob], pathname.split('/').pop() ?? 'upload', { type: contentType });
    const result = await uploadBlob(pathname, file);
    return NextResponse.json({ data: { storageKey: pathname, url: result.url } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
