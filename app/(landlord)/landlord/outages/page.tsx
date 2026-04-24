import { Zap } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { listUpcomingOutages } from '@/lib/services/outages';

export default async function LandlordOutagesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const outages = await listUpcomingOutages(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Landlord Portal" title="Outages" description="Upcoming PM and Eskom-linked outages affecting your properties." />
      <Card className="overflow-hidden border border-border p-0">
        {outages.length === 0 ? (
          <EmptyState
            icon={<Zap className="size-5" />}
            title="No upcoming outages"
            description="Scheduled outages affecting your portfolio will appear here once synced from Eskom or created by your property manager."
          />
        ) : (
          <div className="divide-y divide-border/60">
            {outages.map((row) => (
              <div key={row.id} className="px-5 py-4">
                <div className="font-medium text-foreground">{row.source}</div>
                <div className="text-sm text-muted-foreground">
                  {row.startsAt.toISOString().slice(0, 16).replace('T', ' ')} to {row.endsAt.toISOString().slice(0, 16).replace('T', ' ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
