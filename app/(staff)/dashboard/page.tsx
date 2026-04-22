import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Home as HomeIcon,
  TrendingUp,
  Users,
} from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { getDashboardSummary } from '@/lib/services/dashboard';
import { cn } from '@/lib/utils';

type ExpiringSoon = {
  id: string;
  propertyName: string;
  unitLabel: string;
  primaryTenantName: string | null;
  endDate: string;
  daysUntilExpiry: number;
};

type RecentLease = {
  id: string;
  propertyName: string;
  unitLabel: string;
  primaryTenantName: string | null;
  startDate: string;
  endDate: string;
  state: string;
};

export default async function DashboardPage() {
  const session = await auth();
  const ctx = {
    orgId: session!.user.orgId,
    userId: session!.user.id,
    role: session!.user.role,
  };
  const summary = await getDashboardSummary(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="An overview of your portfolio, occupancy, and lease activity."
      />

      {summary.conflictUnits > 0 ? (
        <div className="relative overflow-hidden border border-destructive/20 bg-card px-5 py-4 animate-fade-in">
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-destructive" />
          <div className="flex items-start gap-3 pl-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-destructive/20 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
                Lease conflicts detected
              </p>
              <p className="mt-2 leading-[1.7] text-destructive/80">
                {summary.conflictUnits} unit{summary.conflictUnits === 1 ? '' : 's'} have overlapping active leases.
                Review immediately.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={summary.totalProperties} icon={<Building2 />} tone="primary" />
        <StatCard label="Units" value={summary.totalUnits} icon={<HomeIcon />} tone="violet" />
        <StatCard label="Active leases" value={summary.activeLeases} icon={<FileText />} tone="emerald" />
        <StatCard
          label="Tenants"
          value={summary.occupiedUnits}
          hint="Occupied units"
          icon={<Users />}
          tone="amber"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Occupied" value={summary.occupiedUnits} tone="emerald" icon={<CheckCircle2 />} />
        <MiniStat label="Vacant" value={summary.vacantUnits} tone="slate" icon={<HomeIcon />} />
        <MiniStat label="Upcoming" value={summary.upcomingUnits} tone="violet" icon={<Clock />} />
        <MiniStat
          label="Expiring soon"
          value={summary.expiringSoonLeases}
          tone="amber"
          icon={<CalendarClock />}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[28px] font-light tracking-[-0.01em] text-foreground">
              Expiring soon
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Leases ending in the next window.
            </p>
          </div>
          <Link
            href="/leases"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] transition-colors hover:text-foreground"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {summary.expiringSoonList.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="size-5" />}
            title="All clear"
            description="No leases are expiring in the window."
          />
        ) : (
          <Card className="overflow-hidden border border-border p-0">
            <ul className="divide-y divide-border/60">
              {summary.expiringSoonList.map((lease: ExpiringSoon) => (
                <li
                  key={lease.id}
                  className={cn(
                    'group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-sm transition-colors hover:bg-[color:var(--muted)]/50',
                    lease.daysUntilExpiry <= 7
                      ? 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-destructive'
                      : lease.daysUntilExpiry <= 30
                        ? 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[color:var(--accent)]'
                        : 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary',
                  )}
                >
                  <Link
                    href={`/leases/${lease.id}`}
                    className="font-medium text-foreground transition-colors hover:text-[color:var(--accent)]"
                  >
                    {lease.propertyName} / {lease.unitLabel}
                  </Link>
                  <span className="text-muted-foreground">{lease.primaryTenantName ?? '-'}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-muted-foreground">Ends {lease.endDate}</span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset',
                        lease.daysUntilExpiry <= 7
                          ? 'bg-destructive/10 text-destructive ring-destructive/25'
                          : 'bg-[color:var(--accent)]/10 text-foreground ring-[color:var(--accent)]/30',
                      )}
                    >
                      {lease.daysUntilExpiry}d
                    </span>
                    <Link
                      href={`/leases/${lease.id}/renew`}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'font-mono text-[10px] uppercase tracking-[0.14em]',
                      )}
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
            <h2 className="font-serif text-[28px] font-light tracking-[-0.01em] text-foreground">
              Recent leases
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Latest activity across your portfolio.
            </p>
          </div>
          <Link
            href="/leases"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] transition-colors hover:text-foreground"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {summary.recentLeases.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No leases yet"
            description="Create your first lease to get started."
          />
        ) : (
          <Card className="overflow-hidden border border-border p-0">
            <ul className="divide-y divide-border/60">
              {summary.recentLeases.map((lease: RecentLease) => (
                <li
                  key={lease.id}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-sm transition-colors hover:bg-[color:var(--muted)]/50"
                >
                  <Link
                    href={`/leases/${lease.id}`}
                    className="font-medium text-foreground transition-colors hover:text-[color:var(--accent)]"
                  >
                    {lease.propertyName} / {lease.unitLabel}
                  </Link>
                  <span className="text-muted-foreground">{lease.primaryTenantName ?? '-'}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {lease.startDate} - {lease.endDate}
                    </span>
                    <LeaseStatusBadge
                      status={lease.state as 'DRAFT' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED' | 'RENEWED'}
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

const TONE: Record<'emerald' | 'slate' | 'violet' | 'amber', { stripe: string; icon: string }> = {
  emerald: {
    stripe: 'bg-emerald-500',
    icon: 'border-emerald-600/20 text-emerald-700 dark:text-emerald-300',
  },
  slate: {
    stripe: 'bg-border',
    icon: 'border-border text-muted-foreground',
  },
  violet: {
    stripe: 'bg-primary',
    icon: 'border-primary/20 text-primary dark:text-primary-foreground',
  },
  amber: {
    stripe: 'bg-[color:var(--accent)]',
    icon: 'border-[color:var(--accent)]/25 text-[color:var(--accent)]',
  },
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
    <div className="group relative overflow-hidden border border-border bg-card px-4 py-4 transition-colors hover:bg-[color:var(--muted)]/50">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-0.5', TONE[tone].stripe)} />
      <div className="flex items-center justify-between gap-4 pl-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 font-serif text-[30px] font-light leading-none tracking-[-0.02em] text-foreground">
            {value}
          </div>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center border opacity-70 transition-opacity group-hover:opacity-100 [&_svg]:size-5',
            TONE[tone].icon,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
