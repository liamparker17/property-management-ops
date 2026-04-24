import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { db } from '@/lib/db';

export default async function AgentMaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  if (!ctx.user?.managingAgentId) notFound();
  const row = await db.maintenanceRequest.findFirst({
    where: {
      id,
      orgId: ctx.orgId,
      unit: { property: { assignedAgentId: ctx.user.managingAgentId, deletedAt: null } },
    },
    include: {
      unit: { include: { property: { select: { name: true } } } },
      vendor: true,
      quotes: true,
    },
  });
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title={row.title} description={`${row.unit.property.name} / ${row.unit.label}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[24px] font-light text-foreground">Ticket</h2>
          <p className="mt-4 text-sm text-muted-foreground">{row.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">{row.status.replace('_', ' ')} · {row.priority}</p>
        </Card>
        <Card className="border border-border p-5">
          <h2 className="font-serif text-[24px] font-light text-foreground">Assignment</h2>
          <p className="mt-4 text-sm text-muted-foreground">{row.vendor?.name ?? 'No vendor assigned'}</p>
          {row.quotes.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No quotes captured yet.</p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{row.quotes.length} quote{row.quotes.length === 1 ? '' : 's'} on file.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
