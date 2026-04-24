import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { formatFinancialYearLabel } from '@/lib/financial-year';
import { getPackOrThrow } from '@/lib/services/tax-reporting';
import { getYearOrThrow } from '@/lib/services/year-end';

type Params = { packId: string };

export const GET = withOrg<Params>(async (_req, ctx, { packId }) => {
  const pack = await getPackOrThrow(ctx, packId);
  if (!pack.csvKey) throw ApiError.notFound('Tax pack CSV not generated');
  const year = await getYearOrThrow(ctx, pack.yearId);
  const response = await fetch(
    pack.csvKey.startsWith('http') ? pack.csvKey : `https://blob.vercel-storage.com/${pack.csvKey}`,
  );
  if (!response.ok) throw ApiError.internal('Failed to fetch tax pack CSV');
  const body = await response.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tax-pack-${formatFinancialYearLabel(year.startDate)}.csv"`,
    },
  });
});
