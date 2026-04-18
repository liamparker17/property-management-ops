import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  FileText,
  Home as HomeIcon,
  TrendingUp,
  Users,
  CalendarClock,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import { auth } from '@/lib/auth';
import { getDashboardSummary } from '@/lib/services/dashboard';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState } from '@/components/empty-state';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="An overview of your portfolio, occupancy, and lease activity."
      />

      {s.conflictUnits > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 animate-fade-in">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-destructive">Lease conflicts detected</p>
            <p className="mt-0.5 text-destructive/80">
              {s.conflictUnits} unit{s.conflictUnits === 1 ? '' : 's'} have overlapping active leases. Review immediately.
            </p>
          </div>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={s.totalProperties} icon={<Building2 />} tone="primary" />
        <StatCard label="Units" value={s.totalUnits} icon={<HomeIcon />} tone="violet" />
        <StatCard label="Active leases" value={s.activeLeases} icon={<FileText />} tone="emerald" />
        <StatCard label="Tenants" value={s.occupiedUnits} hint="Occupied units" icon={<Users />} tone="sky" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Occupied" value={s.occupiedUnits} tone="emerald" icon={<CheckCircle2 />} />
        <MiniStat label="Vacant" value={s.vacantUnits} tone="slate" icon={<HomeIcon />} />
        <MiniStat label="Upcoming" value={s.upcomingUnits} tone="violet" icon={<Clock />} />
        <MiniStat label="Expiring soon" value={s.expiringSoonLeases} tone="amber" icon={<CalendarClock />} />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Expiring soon</h2>
            <p className="text-sm text-muted-foreground">Leases ending in the next window.</p>
          </div>
          <Link
            href="/leases"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {s.expiringSoonList.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="size-5" />}
            title="All clear"
            description="No leases are expiring in the window."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border/60">
              {s.expiringSoonList.map((l: ExpiringSoon) => (
                <li
                  key={l.id}
                  className={cn(
                    'group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm transition-colors hover:bg-muted/40',
                    l.daysUntilExpiry <= 7
                      ? 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-destructive'
                      : l.daysUntilExpiry <= 30
                        ? 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-amber-500'
                        : 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-violet-500',
                  )}
                >
                  <Link
                    href={`/leases/${l.id}`}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {l.propertyName} · {l.unitLabel}
                  </Link>
                  <span className="text-muted-foreground">{l.primaryTenantName ?? '—'}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-muted-foreground">Ends {l.endDate}</span>
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300">
                      {l.daysUntilExpiry}d
                    </span>
                    <Link
                      href={`/leases/${l.id}/renew`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      Renew
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recent leases</h2>
            <p className="text-sm text-muted-foreground">Latest activity across your portfolio.</p>
          </div>
          <Link
            href="/leases"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {s.recentLeases.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No leases yet"
            description="Create your first lease to get started."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border/60">
              {s.recentLeases.map((l: RecentLease) => (
                <li
                  key={l.id}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <Link
                    href={`/leases/${l.id}`}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {l.propertyName} · {l.unitLabel}
                  </Link>
                  <span className="text-muted-foreground">{l.primaryTenantName ?? '—'}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {l.startDate} → {l.endDate}
                    </span>
                    <LeaseStatusBadge
                      status={l.state as 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED'}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

const TONE: Record<'emerald' | 'slate' | 'violet' | 'amber', string> = {
  emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
  slate: 'border-slate-500/20 bg-slate-500/5 text-slate-700 dark:text-slate-300',
  violet: 'border-violet-500/20 bg-violet-500/5 text-violet-700 dark:text-violet-300',
  amber: 'border-amber-500/25 bg-amber-500/5 text-amber-800 dark:text-amber-300',
};

function MiniStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'group flex items-center justify-between rounded-xl border bg-card px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-card',
        TONE[tone],
      )}
    >
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{label}</div>
        <div className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</div>
      </div>
      <div className="opacity-60 transition-transform group-hover:scale-110 [&_svg]:size-5">{icon}</div>
    </div>
  );
}
