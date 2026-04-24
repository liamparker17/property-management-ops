import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { getAgentMaintenanceQueue } from '@/lib/services/agent-analytics';

export default async function AgentMaintenancePage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const rows = await getAgentMaintenanceQueue(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent Portal" title="Maintenance" description="Assigned maintenance queue across your managed properties." />
      <Card className="overflow-hidden border border-border p-0">
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
      </Card>
    </div>
  );
}
