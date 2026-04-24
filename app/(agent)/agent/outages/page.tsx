import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { listUpcomingOutages } from '@/lib/services/outages';

export default async function AgentOutagesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const outages = await listUpcomingOutages(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Outages" description="Upcoming outages affecting your assigned properties." />
      <Card className="overflow-hidden border border-border p-0">
        <div className="divide-y divide-border/60">
          {outages.map((row) => (
            <div key={row.id} className="px-5 py-4">
              <div className="font-medium text-foreground">{row.source}</div>
              <div className="text-sm text-muted-foreground">{row.startsAt.toISOString().slice(0, 16).replace('T', ' ')} to {row.endsAt.toISOString().slice(0, 16).replace('T', ' ')}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
