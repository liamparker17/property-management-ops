import Link from 'next/link';
import { AlertTriangle, ArrowRight, Building2, FileText, Home as HomeIcon, TrendingUp, Users } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getDashboardSummary } from '@/lib/services/dashboard';
import { LeaseStatusBadge } from '@/components/lease-status-badge';

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An overview of your portfolio, occupancy, and lease activity.
        </p>
      </div>

      {s.conflictUnits > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-medium text-red-900">Lease conflicts detected</p>
            <p className="mt-0.5 text-red-800">
              {s.conflictUnits} unit{s.conflictUnits === 1 ? '' : 's'} have overlapping active leases. Review immediately.
            </p>
          </div>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Properties" value={s.totalProperties} icon={Building2} />
        <Stat label="Units" value={s.totalUnits} icon={HomeIcon} />
        <Stat label="Active leases" value={s.activeLeases} icon={FileText} />
        <Stat label="Tenants" value={s.occupiedUnits} icon={Users} hint="Occupied units" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Occupied" value={s.occupiedUnits} tone="emerald" />
        <MiniStat label="Vacant" value={s.vacantUnits} tone="slate" />
        <MiniStat label="Upcoming" value={s.upcomingUnits} tone="indigo" />
        <MiniStat label="Expiring soon" value={s.expiringSoonLeases} tone="amber" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Expiring soon</h2>
            <p className="text-sm text-muted-foreground">Leases ending in the next window.</p>
          </div>
          <Link href="/leases" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {s.expiringSoonList.length === 0 ? (
          <EmptyState icon={TrendingUp} title="All clear" description="No leases are expiring in the window." />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y">
              {s.expiringSoonList.map((l: ExpiringSoon) => (
                <li key={l.id} className="flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/50">
                  <Link href={`/leases/${l.id}`} className="font-medium text-foreground hover:text-primary">
                    {l.propertyName} · {l.unitLabel}
                  </Link>
                  <span className="text-muted-foreground">{l.primaryTenantName ?? '—'}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-muted-foreground">Ends {l.endDate}</span>
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                      {l.daysUntilExpiry}d
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent leases</h2>
            <p className="text-sm text-muted-foreground">Latest activity across your portfolio.</p>
          </div>
          <Link href="/leases" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {s.recentLeases.length === 0 ? (
          <EmptyState icon={FileText} title="No leases yet" description="Create your first lease to get started." />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y">
              {s.recentLeases.map((l: RecentLease) => (
                <li key={l.id} className="flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/50">
                  <Link href={`/leases/${l.id}`} className="font-medium text-foreground hover:text-primary">
                    {l.propertyName} · {l.unitLabel}
                  </Link>
                  <span className="text-muted-foreground">{l.primaryTenantName ?? '—'}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {l.startDate} → {l.endDate}
                    </span>
                    <LeaseStatusBadge status={l.state as 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED'} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, hint }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const TONE: Record<'emerald' | 'slate' | 'indigo' | 'amber', string> = {
  emerald: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
  slate: 'text-slate-700 bg-slate-50 ring-slate-200',
  indigo: 'text-indigo-700 bg-indigo-50 ring-indigo-200',
  amber: 'text-amber-800 bg-amber-50 ring-amber-200',
};

function MiniStat({ label, value, tone }: { label: string; value: number; tone: keyof typeof TONE }) {
  return (
    <div className={`rounded-lg px-4 py-3 ring-1 ring-inset ${TONE[tone]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
