import Link from 'next/link';

import { MapPanel } from '@/components/analytics/maps/map-panel';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { getAgentPortfolio } from '@/lib/services/agent-analytics';

export default async function AgentPropertiesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const data = await getAgentPortfolio(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Properties" description="Assigned properties with direct drill-through into each asset." />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="overflow-hidden border border-border p-0">
          <div className="divide-y divide-border/60">
            {data.rows.map((row) => (
              <Link key={row.id} href={row.href} className="block px-5 py-4 hover:bg-[color:var(--muted)]/35">
                <div className="font-medium text-foreground">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.suburb}, {row.city} · {row.unitCount} units</div>
              </Link>
            ))}
          </div>
        </Card>
        <MapPanel title="Assigned map" pins={data.pins} />
      </div>
    </div>
  );
}
