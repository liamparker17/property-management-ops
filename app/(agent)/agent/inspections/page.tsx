import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { getAgentInspectionQueue } from '@/lib/services/agent-analytics';

export default async function AgentInspectionsPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  if (!ctx.user?.managingAgentId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Agent Portal" title="Inspections" description="Upcoming and overdue inspections across assigned properties." />
        <EmptyState
          icon={<ClipboardCheck className="size-5" />}
          title="No managing-agent record linked"
          description="Ask your administrator to link your account to a managing-agent profile."
        />
      </div>
    );
  }
  const rows = await getAgentInspectionQueue(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Inspections" description="Upcoming and overdue inspections across assigned properties." />
      <Card className="overflow-hidden border border-border p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title="No inspections scheduled"
            description="Inspections on your assigned portfolio will appear here as they're booked."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((row) => (
              <Link key={row.id} href={`/inspections/${row.id}`} className="block px-5 py-4 hover:bg-[color:var(--muted)]/35">
                <div className="font-medium text-foreground">{row.propertyName} / {row.unitLabel}</div>
                <div className="text-xs text-muted-foreground">{row.type.replace('_', ' ')} · {row.status.replace('_', ' ')} · {row.scheduledAt.toISOString().slice(0, 10)}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
