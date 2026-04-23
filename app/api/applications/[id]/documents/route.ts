import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { uploadApplicationDocument } from '@/lib/services/applications';

type Params = { id: string };

export const POST = withOrg<Params>(
  async (req, ctx, { id }) => {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw ApiError.validation({ file: 'Missing file' });
    return NextResponse.json({ data: await uploadApplicationDocument(ctx, id, file) }, { status: 201 });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER'] },
);
