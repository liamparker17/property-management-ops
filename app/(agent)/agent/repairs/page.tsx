import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';

export default async function AgentRepairsPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const rows = await db.maintenanceRequest.findMany({
    where: {
      orgId: ctx.orgId,
      unit: { property: { assignedAgentId: ctx.user!.managingAgentId!, deletedAt: null } },
    },
    include: { unit: { include: { property: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Repairs" description="Tenant-reported repair tickets across your assigned portfolio." />
      <Card className="overflow-hidden border border-border p-0">
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <div key={row.id} className="px-5 py-4">
              <div className="font-medium text-foreground">{row.title}</div>
              <div className="text-xs text-muted-foreground">{row.unit.property.name} / {row.unit.label} · {row.status.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
