import { ShieldCheck } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default function StaffDashboardTrustPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Trust"
        description="Trust balance per landlord, reconciliation status, and audit volume."
      />
      <Card className="overflow-hidden border border-border p-0">
        <EmptyState
          icon={<ShieldCheck className="size-5" />}
          title="Coming in Phase 4"
          description="Trust analytics — per-landlord balances, reconciliation health, audit-log volume — will land here in Phase 4 of the dashboard rollout."
        />
      </Card>
    </div>
  );
}
