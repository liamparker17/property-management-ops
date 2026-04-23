import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withOrg } from '@/lib/auth/with-org';
import { ApiError } from '@/lib/errors';
import { importReceiptsCsv } from '@/lib/services/payments';
import type { BankCsvDialect } from '@/lib/integrations/bank-csv/dialects';

const dialectSchema = z.enum(['generic', 'fnb', 'absa', 'standardbank', 'nedbank']);

export const POST = withOrg(
  async (req, ctx) => {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      throw ApiError.validation({ file: 'CSV file is required' });
    }
    const dialectRaw = (form.get('dialect') ?? 'generic').toString();
    const dialect: BankCsvDialect = dialectSchema.parse(dialectRaw);
    const csv = await file.text();
    const result = await importReceiptsCsv(ctx, csv, dialect);
    return NextResponse.json({
      data: {
        createdCount: result.created.length,
        skippedCount: result.skipped.length,
        created: result.created.map((r) => ({ id: r.id, amountCents: r.amountCents, externalRef: r.externalRef })),
        skipped: result.skipped,
      },
    });
  },
  { requireRole: ['ADMIN', 'PROPERTY_MANAGER', 'FINANCE'] },
);
