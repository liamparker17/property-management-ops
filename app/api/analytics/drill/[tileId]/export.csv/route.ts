import { NextResponse } from 'next/server';

import { withOrg } from '@/lib/auth/with-org';
import { ApiError, toErrorResponse } from '@/lib/errors';
import {
  getArrearsAgingDetail,
  getTopOverdueDetail,
  getLeaseExpiriesDetail,
  getUrgentMaintenanceDetail,
} from '@/lib/services/staff-analytics';
import { drillIdSchema } from '@/lib/zod/analytics-drill';

function csvEscape(value: unknown): string {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}

// withOrg unwraps routeParams.params internally and passes the resolved object
// as the third argument, so we destructure tileId directly.
export const GET = withOrg(async (req, ctx, { tileId }: { tileId: string }) => {
  const parsed = drillIdSchema.safeParse(tileId);
  if (!parsed.success) {
    return toErrorResponse(ApiError.badRequest('Unknown drill id'));
  }

  let body = '';
  const filename = `${parsed.data}.csv`;

  if (parsed.data === 'arrears-aging') {
    const data = await getArrearsAgingDetail(ctx);
    const rows: string[][] = [
      ['Bucket', 'Tenant', 'Property', 'Unit', 'Outstanding (cents)', 'Due', 'Age (days)'],
    ];
    for (const bucket of data.buckets) {
      for (const r of bucket.rows) {
        rows.push([
          bucket.label,
          r.tenant,
          r.property,
          r.unit,
          String(r.cents),
          r.dueDate.toISOString(),
          String(r.ageDays),
        ]);
      }
    }
    body = rowsToCsv(rows);
  } else if (parsed.data === 'top-overdue') {
    const data = await getTopOverdueDetail(ctx);
    const rows: string[][] = [
      ['Tenant', 'Property', 'Unit', 'Outstanding (cents)', 'Due', 'Age (days)'],
    ];
    for (const r of data.rows) {
      rows.push([
        r.tenant,
        r.property,
        r.unit,
        String(r.cents),
        r.dueDate.toISOString(),
        String(r.ageDays),
      ]);
    }
    body = rowsToCsv(rows);
  } else if (parsed.data === 'lease-expiries') {
    const data = await getLeaseExpiriesDetail(ctx);
    const rows: string[][] = [
      ['Bucket', 'Tenant', 'Property', 'Unit', 'End date', 'Days until expiry'],
    ];
    for (const bucket of data.buckets) {
      for (const r of bucket.rows) {
        rows.push([
          bucket.label,
          r.tenant ?? '',
          r.property,
          r.unit,
          r.endDate.toISOString(),
          String(r.daysUntilExpiry),
        ]);
      }
    }
    body = rowsToCsv(rows);
  } else if (parsed.data === 'urgent-maintenance') {
    const data = await getUrgentMaintenanceDetail(ctx);
    const rows: string[][] = [
      ['Title', 'Priority', 'Status', 'Property', 'Unit', 'Vendor', 'Age (days)', 'Scheduled'],
    ];
    for (const r of data.rows) {
      rows.push([
        r.title,
        r.priority,
        r.status,
        r.property,
        r.unit,
        r.vendorName ?? '',
        String(r.ageDays),
        r.scheduledFor ? r.scheduledFor.toISOString() : '',
      ]);
    }
    body = rowsToCsv(rows);
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
});
