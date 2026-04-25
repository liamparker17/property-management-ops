import { Zap } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';

export default function StaffDashboardUtilitiesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Utilities"
        description="Recovery rate, consumption trends, top consumers, tariff coverage, and anomaly alerts."
      />
      <Card className="overflow-hidden border border-border p-0">
        <EmptyState
          icon={<Zap className="size-5" />}
          title="Coming in Phase 4"
          description="Utility analytics — recovery vs shortfall, consumption by type, top-consuming units — will land here in Phase 4 of the dashboard rollout."
        />
      </Card>
    </div>
  );
}
