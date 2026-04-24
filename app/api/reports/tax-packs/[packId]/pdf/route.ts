import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { getPackOrThrow } from '@/lib/services/tax-reporting';
import { formatFinancialYearLabel } from '@/lib/financial-year';
import { getYearOrThrow } from '@/lib/services/year-end';

type Params = { packId: string };

export const GET = withOrg<Params>(async (_req, ctx, { packId }) => {
  const pack = await getPackOrThrow(ctx, packId);
  if (!pack.storageKey) throw ApiError.notFound('Tax pack PDF not generated');
  const year = await getYearOrThrow(ctx, pack.yearId);
  const response = await fetch(
    pack.storageKey.startsWith('http')
      ? pack.storageKey
      : `https://blob.vercel-storage.com/${pack.storageKey}`,
  );
  if (!response.ok) throw ApiError.internal('Failed to fetch tax pack PDF');
  const body = await response.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="tax-pack-${formatFinancialYearLabel(year.startDate)}.pdf"`,
    },
  });
});
