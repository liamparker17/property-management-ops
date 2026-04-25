import { Users } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default function StaffDashboardTenantsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Tenants"
        description="Application funnel, TPN status, affordability, and applicant source mix."
      />
      <Card className="overflow-hidden border border-border p-0">
        <EmptyState
          icon={<Users className="size-5" />}
          title="Coming in Phase 4"
          description="Tenant analytics — applications funnel, TPN gates, affordability distribution — will land here in Phase 4 of the dashboard rollout."
        />
      </Card>
    </div>
  );
}
