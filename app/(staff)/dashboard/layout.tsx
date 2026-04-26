import type { ReactNode } from 'react';

import { DashboardShell } from '@/components/analytics/dashboard-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
