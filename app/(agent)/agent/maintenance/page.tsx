import Link from 'next/link';
import { Wrench } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { getAgentMaintenanceQueue } from '@/lib/services/agent-analytics';

export default async function AgentMaintenancePage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  if (!ctx.user?.managingAgentId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Agent Portal" title="Maintenance" description="Assigned maintenance queue across your managed properties." />
        <EmptyState
          icon={<Wrench className="size-5" />}
          title="No managing-agent record linked"
          description="Ask your administrator to link your account to a managing-agent profile to see maintenance tickets."
        />
      </div>
    );
  }
  const rows = await getAgentMaintenanceQueue(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Maintenance" description="Assigned maintenance queue across your managed properties." />
      <Card className="overflow-hidden border border-border p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Wrench className="size-5" />}
            title="No maintenance tickets"
            description="Tenant-reported issues on your assigned properties will appear here as they're logged."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--muted)]/35 text-left">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Vendor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <Link href={row.href} className="font-medium hover:underline">{row.title}</Link>
                    </td>
                    <td className="px-4 py-3">{row.propertyName} / {row.unitLabel}</td>
                    <td className="px-4 py-3">{row.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3">{row.vendorName ?? 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
