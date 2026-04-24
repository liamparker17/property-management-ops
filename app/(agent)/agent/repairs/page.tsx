import { Wrench } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';

export default async function AgentRepairsPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  if (!ctx.user?.managingAgentId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Agent Portal" title="Repairs" description="Tenant-reported repair tickets across your assigned portfolio." />
        <EmptyState
          icon={<Wrench className="size-5" />}
          title="No managing-agent record linked"
          description="Ask your administrator to link your account to a managing-agent profile."
        />
      </div>
    );
  }
  const rows = await db.maintenanceRequest.findMany({
    where: {
      orgId: ctx.orgId,
      unit: { property: { assignedAgentId: ctx.user.managingAgentId, deletedAt: null } },
    },
    include: { unit: { include: { property: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Repairs" description="Tenant-reported repair tickets across your assigned portfolio." />
      <Card className="overflow-hidden border border-border p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Wrench className="size-5" />}
            title="No repair requests"
            description="Tenant-submitted repair requests will appear here as they arrive."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((row) => (
              <div key={row.id} className="px-5 py-4">
                <div className="font-medium text-foreground">{row.title}</div>
                <div className="text-xs text-muted-foreground">{row.unit.property.name} / {row.unit.label} · {row.status.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
