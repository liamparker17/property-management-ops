import { RankedList } from '@/components/analytics/ranked-list';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { formatDate } from '@/lib/format';
import { getStaffOperations } from '@/lib/services/staff-analytics';

export default async function StaffOperationsPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const data = await getStaffOperations(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Operations"
        description="Renewal pressure, blocked approvals, and missing move-in workbench items."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <RankedList
          title="Expiring in 30"
          eyebrow="Leases"
          items={data.expiring30.map((row) => ({
            id: row.id,
            title: `${row.propertyName} / ${row.unitLabel}`,
            subtitle: row.tenantName ?? 'Primary tenant missing',
            value: `${row.daysUntilExpiry}d`,
            href: row.href,
          }))}
        />
        <RankedList
          title="Expiring in 60"
          eyebrow="Leases"
          items={data.expiring60.map((row) => ({
            id: row.id,
            title: `${row.propertyName} / ${row.unitLabel}`,
            subtitle: row.tenantName ?? 'Primary tenant missing',
            value: `${row.daysUntilExpiry}d`,
            href: row.href,
          }))}
        />
        <RankedList
          title="Expiring in 90"
          eyebrow="Leases"
          items={data.expiring90.map((row) => ({
            id: row.id,
            title: `${row.propertyName} / ${row.unitLabel}`,
            subtitle: row.tenantName ?? 'Primary tenant missing',
            value: `${row.daysUntilExpiry}d`,
            href: row.href,
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Approvals</p>
          <h2 className="mt-2 font-serif text-[28px] font-light text-foreground">Blocked approvals</h2>
          <div className="mt-4 space-y-3">
            {data.blockedApprovals.map((row) => (
              <div key={row.id} className="border border-border/70 px-4 py-3">
                <div className="font-medium text-foreground">{row.kind.replaceAll('_', ' ')}</div>
                <div className="text-xs text-muted-foreground">
                  {row.propertyName ?? 'Organisation-wide'} · Requested {formatDate(row.requestedAt)}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="border border-border p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--accent)]">Inspections</p>
          <h2 className="mt-2 font-serif text-[28px] font-light text-foreground">Missing move-ins</h2>
          <div className="mt-4 space-y-3">
            {data.missingMoveIns.map((row) => (
              <div key={row.id} className="border border-border/70 px-4 py-3">
                <div className="font-medium text-foreground">{row.label}</div>
                <div className="text-xs text-muted-foreground">{row.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
