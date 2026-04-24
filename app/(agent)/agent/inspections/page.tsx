import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { getAgentInspectionQueue } from '@/lib/services/agent-analytics';

export default async function AgentInspectionsPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const rows = await getAgentInspectionQueue(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Inspections" description="Upcoming and overdue inspections across assigned properties." />
      <Card className="overflow-hidden border border-border p-0">
        <div className="divide-y divide-border/60">
          {rows.map((row) => (
            <Link key={row.id} href={`/inspections/${row.id}`} className="block px-5 py-4 hover:bg-[color:var(--muted)]/35">
              <div className="font-medium text-foreground">{row.propertyName} / {row.unitLabel}</div>
              <div className="text-xs text-muted-foreground">{row.type.replace('_', ' ')} · {row.status.replace('_', ' ')} · {row.scheduledAt.toISOString().slice(0, 10)}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
