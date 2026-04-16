import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getDashboardSummary } from '@/lib/services/dashboard';

type ExpiringSoon = { id: string; propertyName: string; unitLabel: string; primaryTenantName: string | null; endDate: string; daysUntilExpiry: number };
type RecentLease = { id: string; propertyName: string; unitLabel: string; primaryTenantName: string | null; startDate: string; endDate: string; state: string };

export default async function DashboardPage() {
  const session = await auth();
  const ctx = {
    orgId: session!.user.orgId,
    userId: session!.user.id,
    role: session!.user.role,
  };
  const s = await getDashboardSummary(ctx);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {s.conflictUnits > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <strong>{s.conflictUnits}</strong> unit(s) have overlapping active leases. Review
          immediately.
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Properties" value={s.totalProperties} />
        <Stat label="Units" value={s.totalUnits} />
        <Stat label="Occupied" value={s.occupiedUnits} />
        <Stat label="Vacant" value={s.vacantUnits} />
        <Stat label="Upcoming" value={s.upcomingUnits} />
        <Stat label="Active leases" value={s.activeLeases} />
        <Stat label="Expiring soon" value={s.expiringSoonLeases} />
        <Stat label="Expired (not terminated)" value={s.expiredLeases} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Expiring soon</h2>
        {s.expiringSoonList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in the window.</p>
        ) : (
          <ul className="divide-y rounded-md border bg-white text-sm">
            {s.expiringSoonList.map((l: ExpiringSoon) => (
              <li key={l.id} className="flex items-center gap-4 p-3">
                <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                  {l.propertyName} · {l.unitLabel}
                </Link>
                <span className="text-muted-foreground">{l.primaryTenantName ?? '—'}</span>
                <span className="ml-auto">
                  Ends {l.endDate} ({l.daysUntilExpiry}d)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent leases</h2>
        <ul className="divide-y rounded-md border bg-white text-sm">
          {s.recentLeases.map((l: RecentLease) => (
            <li key={l.id} className="flex items-center gap-4 p-3">
              <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                {l.propertyName} · {l.unitLabel}
              </Link>
              <span className="text-muted-foreground">{l.primaryTenantName ?? '—'}</span>
              <span className="ml-auto text-muted-foreground">
                {l.startDate} → {l.endDate}
              </span>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs">{l.state}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
