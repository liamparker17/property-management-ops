import { BarChart } from '@/components/analytics/charts/bar-chart';
import { RankedList } from '@/components/analytics/ranked-list';
import { StatusStrip } from '@/components/analytics/status-strip';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { formatZar } from '@/lib/format';
import { getStaffMaintenance } from '@/lib/services/staff-analytics';

export default async function StaffMaintenancePage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const data = await getStaffMaintenance(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Maintenance"
        description="Queue pressure, vendor concentration, and average close time across the portfolio."
      />

      <StatusStrip
        items={[
          { id: 'avg-close', label: 'Average close', value: `${data.averageCloseDays} days`, tone: 'accent' },
          { id: 'queue', label: 'Queue size', value: String(data.queue.length) },
          { id: 'vendors', label: 'Tracked vendors', value: String(data.vendorLeaderboard.length) },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <div className="mb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Mix</p>
            <h2 className="mt-2 font-serif text-[28px] font-light text-foreground">Queue by status</h2>
          </div>
          <BarChart data={data.statusCounts} />
        </Card>
        <RankedList
          title="Top vendors"
          eyebrow="Vendors"
          items={data.vendorLeaderboard.map((row) => ({
            id: row.id,
            title: row.label,
            value: formatZar(row.value),
          }))}
          emptyCopy="No vendor-linked maintenance costs have been captured yet."
        />
      </div>

      <Card className="overflow-hidden border border-border p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Queue</p>
          <h2 className="mt-2 font-serif text-[28px] font-light text-foreground">Open work</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--muted)]/35 text-left">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {data.queue.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">{row.subtitle}</td>
                  <td className="px-4 py-3">{row.priority}</td>
                  <td className="px-4 py-3">{row.status.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{row.scheduledFor ? row.scheduledFor.toISOString().slice(0, 10) : 'Unscheduled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
