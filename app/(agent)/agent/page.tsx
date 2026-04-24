import { ShieldAlert } from 'lucide-react';

import { KpiTile } from '@/components/analytics/kpi-tile';
import { MapPanel } from '@/components/analytics/maps/map-panel';
import { RankedList } from '@/components/analytics/ranked-list';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { getAgentCommandCenter } from '@/lib/services/agent-analytics';

export const metadata = {
  title: 'Agent Operations',
};

export default async function AgentDashboardPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  if (!ctx.user?.managingAgentId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Agent Portal" title="Operations dashboard" description="Assigned-property work queues and inspection pressure for today." />
        <EmptyState
          icon={<ShieldAlert className="size-5" />}
          title="No managing-agent record linked"
          description="Your account has the managing-agent role but no managing-agent profile is linked. Ask your administrator to link your account from /settings/team so your assigned properties and queues can load."
        />
      </div>
    );
  }
  const data = await getAgentCommandCenter(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Operations dashboard" description="Assigned-property work queues and inspection pressure for today." />
      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile kpiId="AGENT_OPEN_TICKETS" value={data.kpis.AGENT_OPEN_TICKETS} prior={data.priorKpis.AGENT_OPEN_TICKETS} role="MANAGING_AGENT" />
        <KpiTile kpiId="BLOCKED_APPROVALS" value={data.kpis.BLOCKED_APPROVALS} prior={data.priorKpis.BLOCKED_APPROVALS} role="MANAGING_AGENT" />
        <KpiTile kpiId="AGENT_UPCOMING_INSPECTIONS" value={data.kpis.AGENT_UPCOMING_INSPECTIONS} prior={data.priorKpis.AGENT_UPCOMING_INSPECTIONS} role="MANAGING_AGENT" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr_1fr]">
        <MapPanel title="Assigned footprint" pins={data.pins} />
        <RankedList title="Ticket queue" eyebrow="Maintenance" items={data.ticketQueue.map((row) => ({ id: row.id, title: row.label, subtitle: row.detail, value: 'Open', href: row.href }))} emptyCopy="No open tickets across your assigned properties." />
        <RankedList title="Inspection queue" eyebrow="Inspections" items={data.inspectionQueue.map((row) => ({ id: row.id, title: row.label, subtitle: row.detail, value: 'Due', href: row.href }))} emptyCopy="No upcoming inspections scheduled." />
      </div>
    </div>
  );
}
