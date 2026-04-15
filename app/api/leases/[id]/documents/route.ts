import { NextResponse } from 'next/server';
import { withOrg } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { uploadLeaseAgreement } from '@/lib/services/documents';

type Params = { id: string };

export const POST = withOrg<Params>(async (req, ctx, { id }) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw ApiError.validation({ file: 'Missing file' });
  const row = await uploadLeaseAgreement(ctx, id, file);
  return NextResponse.json({ data: row }, { status: 201 });
});
