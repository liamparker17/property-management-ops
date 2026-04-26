import type { ReactNode } from 'react';

import { DashboardShell } from '@/components/analytics/dashboard-shell';
import { DrillSheet } from '@/components/analytics/drill-sheet';
import { ArrearsAgingDrill } from '@/components/analytics/drill/arrears-aging-drill';
import { TopOverdueDrill } from '@/components/analytics/drill/top-overdue-drill';
import { LeaseExpiriesDrill } from '@/components/analytics/drill/lease-expiries-drill';
import { UrgentMaintenanceDrill } from '@/components/analytics/drill/urgent-maintenance-drill';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import {
  getArrearsAgingDetail,
  getTopOverdueDetail,
  getLeaseExpiriesDetail,
  getUrgentMaintenanceDetail,
} from '@/lib/services/staff-analytics';
import { drillIdSchema, type DrillId } from '@/lib/zod/analytics-drill';

const DRILL_TITLES: Record<DrillId, string> = {
  'arrears-aging': 'Arrears aging detail',
  'top-overdue': 'All overdue accounts',
  'lease-expiries': 'Upcoming lease expiries',
  'urgent-maintenance': 'Urgent maintenance detail',
};

export default async function DashboardLayout({
  children,
  searchParams,
}: {
  children: ReactNode;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const drillRaw = Array.isArray(sp.drill) ? sp.drill[0] : sp.drill;
  const drillParse = drillRaw ? drillIdSchema.safeParse(drillRaw) : null;
  const drillId: DrillId | null = drillParse?.success ? drillParse.data : null;

  let drillNode: ReactNode = null;
  if (drillId) {
    const session = await auth();
    const ctx = userToRouteCtx(session!.user);
    const csvHref = `/api/analytics/drill/${drillId}/export.csv`;
    const title = DRILL_TITLES[drillId];

    if (drillId === 'arrears-aging') {
      const data = await getArrearsAgingDetail(ctx);
      drillNode = (
        <DrillSheet title={title} csvHref={csvHref}>
          <ArrearsAgingDrill data={data} />
        </DrillSheet>
      );
    } else if (drillId === 'top-overdue') {
      const data = await getTopOverdueDetail(ctx);
      drillNode = (
        <DrillSheet title={title} csvHref={csvHref}>
          <TopOverdueDrill data={data} />
        </DrillSheet>
      );
    } else if (drillId === 'lease-expiries') {
      const data = await getLeaseExpiriesDetail(ctx);
      drillNode = (
        <DrillSheet title={title} csvHref={csvHref}>
          <LeaseExpiriesDrill data={data} />
        </DrillSheet>
      );
    } else if (drillId === 'urgent-maintenance') {
      const data = await getUrgentMaintenanceDetail(ctx);
      drillNode = (
        <DrillSheet title={title} csvHref={csvHref}>
          <UrgentMaintenanceDrill data={data} />
        </DrillSheet>
      );
    }
  }

  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      {drillNode}
    </>
  );
}
