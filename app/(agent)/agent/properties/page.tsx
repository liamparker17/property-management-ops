import Link from 'next/link';
import { Building2 } from 'lucide-react';

import { MapPanel } from '@/components/analytics/maps/map-panel';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { getAgentPortfolio } from '@/lib/services/agent-analytics';

export default async function AgentPropertiesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  if (!ctx.user?.managingAgentId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Agent Portal" title="Properties" description="Assigned properties with direct drill-through into each asset." />
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="No managing-agent record linked"
          description="Ask your administrator to link your account to a managing-agent profile so assigned properties can load."
        />
      </div>
    );
  }
  const data = await getAgentPortfolio(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Properties" description="Assigned properties with direct drill-through into each asset." />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="overflow-hidden border border-border p-0">
          {data.rows.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-5" />}
              title="No assigned properties yet"
              description="Properties your administrator assigns to you will appear here."
            />
          ) : (
            <div className="divide-y divide-border/60">
              {data.rows.map((row) => (
                <Link key={row.id} href={row.href} className="block px-5 py-4 hover:bg-[color:var(--muted)]/35">
                  <div className="font-medium text-foreground">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.suburb}, {row.city} · {row.unitCount} units</div>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <MapPanel title="Assigned map" pins={data.pins} />
      </div>
    </div>
  );
}
