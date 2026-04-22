import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileClock,
  FileText,
  Home as HomeIcon,
  Landmark,
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
import { formatZar } from '@/lib/format';
import { getDashboardSummary } from '@/lib/services/dashboard';
import { cn } from '@/lib/utils';

type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
type ExpiringSoon = DashboardSummary['expiringSoonList'][number];
type RecentLease = DashboardSummary['recentLeases'][number];
type OverdueAccount = DashboardSummary['invoiceOverview']['overdueAccounts'][number];
type TrendPoint = DashboardSummary['invoiceOverview']['monthlyTrend'][number];
type StatusSegment = DashboardSummary['invoiceOverview']['statusBreakdown'][number];
type ExpiryBucket = DashboardSummary['expiryOverview']['buckets'][number];

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
        description="Portfolio, collections, overdue accounts, and lease renewal pressure in one view."
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

      <section className="space-y-4">
        <SectionLead
          eyebrow="Portfolio"
          title="Portfolio snapshot"
          description="Capacity, occupancy, and lease coverage across the organisation."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Properties" value={summary.totalProperties} icon={<Building2 />} tone="primary" />
          <StatCard label="Units" value={summary.totalUnits} icon={<HomeIcon />} tone="violet" />
          <StatCard label="Active leases" value={summary.activeLeases} icon={<FileText />} tone="emerald" />
          <StatCard
            label="Occupied"
            value={summary.occupiedUnits}
            hint={`${summary.vacantUnits} vacant`}
            icon={<Users />}
            tone="amber"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniStat label="Occupied" value={summary.occupiedUnits} tone="emerald" icon={<CheckCircle2 />} />
          <MiniStat label="Vacant" value={summary.vacantUnits} tone="slate" icon={<HomeIcon />} />
          <MiniStat label="Upcoming" value={summary.upcomingUnits} tone="violet" icon={<Clock />} />
          <MiniStat
            label="Expiring soon"
            value={summary.expiringSoonLeases}
            tone="amber"
            icon={<CalendarClock />}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionLead
          eyebrow="Collections"
          title="Collections snapshot"
          description="How much has been invoiced, what has been collected, and where arrears are building up."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Invoiced"
            value={formatZar(summary.invoiceOverview.totalInvoicedCents)}
            hint="Trailing 6 months"
            icon={<Landmark />}
            tone="primary"
          />
          <StatCard
            label="Collected"
            value={formatZar(summary.invoiceOverview.totalCollectedCents)}
            hint={`${summary.invoiceOverview.collectionRatePct}% collection rate`}
            icon={<TrendingUp />}
            tone="emerald"
          />
          <StatCard
            label="Outstanding"
            value={formatZar(summary.invoiceOverview.outstandingCents)}
            hint="Due + overdue"
            icon={<CreditCard />}
            tone="amber"
          />
          <StatCard
            label="Overdue accounts"
            value={summary.invoiceOverview.overdueCount}
            hint={formatZar(summary.invoiceOverview.overdueAmountCents)}
            icon={<FileClock />}
            tone="rose"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <ChartCard
          eyebrow="Trend"
          title="Accounts invoiced vs paid"
          description="Trailing six-month view of issued rent statements versus money actually collected."
        >
          <RevenueTrendChart data={summary.invoiceOverview.monthlyTrend} />
        </ChartCard>

        <ChartCard
          eyebrow="Mix"
          title="Receivables status"
          description="Paid, due, and overdue split across all statements currently on the books."
        >
          <ReceivablesDonut segments={summary.invoiceOverview.statusBreakdown} />
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border border-border p-0">
          <div className="border-b border-border/70 px-5 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
                  Arrears
                </p>
                <h2 className="mt-2 font-serif text-[28px] font-light tracking-[-0.01em] text-foreground">
                  Accounts overdue
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-[1.7] text-muted-foreground">
                  Statements that are past due and still unpaid, ordered by severity.
                </p>
              </div>
              <div className="text-right">
                <div className="font-serif text-[26px] font-light tracking-[-0.02em] text-foreground">
                  {formatZar(summary.invoiceOverview.overdueAmountCents)}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {summary.invoiceOverview.overdueCount} overdue
                </div>
              </div>
            </div>
          </div>
          {summary.invoiceOverview.overdueAccounts.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<CheckCircle2 className="size-5" />}
                title="No overdue accounts"
                description="There are no unpaid statements past due right now."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {summary.invoiceOverview.overdueAccounts.map((account: OverdueAccount) => (
                <li
                  key={account.id}
                  className="grid gap-3 px-5 py-4 text-sm transition-colors hover:bg-[color:var(--muted)]/45 md:grid-cols-[1.2fr_0.8fr_auto]"
                >
                  <div>
                    <div className="font-medium text-foreground">
                      {account.propertyName} / {account.unitLabel}
                    </div>
                    <div className="mt-1 text-muted-foreground">{account.tenantName ?? 'Unassigned primary tenant'}</div>
                  </div>
                  <div className="text-muted-foreground">
                    <div>Due {account.dueDate}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em]">
                      {account.daysOverdue} days overdue
                    </div>
                  </div>
                  <div className="justify-self-start font-medium text-foreground md:justify-self-end">
                    {formatZar(account.amountCents)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <ChartCard
          eyebrow="Renewals"
          title="Expiring lease pressure"
          description="Active leases bucketed by proximity to expiry so PMs can prioritise renewals."
        >
          <ExpiryPressureChart
            buckets={summary.expiryOverview.buckets}
            windowCount={summary.expiringSoonLeases}
            expiredCount={summary.expiredLeases}
          />
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <LeaseListPanel
          eyebrow="Renewals"
          title="Expiring soon"
          description="Leases ending inside the configured warning window."
          actionHref="/leases"
          actionLabel="View all"
        >
          {summary.expiringSoonList.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="size-5" />}
              title="All clear"
              description="No leases are expiring in the current warning window."
            />
          ) : (
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
          )}
        </LeaseListPanel>

        <LeaseListPanel
          eyebrow="Activity"
          title="Recent leases"
          description="Latest lease records created across the portfolio."
          actionHref="/leases"
          actionLabel="View all"
        >
          {summary.recentLeases.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-5" />}
              title="No leases yet"
              description="Create your first lease to start building activity."
            />
          ) : (
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
          )}
        </LeaseListPanel>
      </section>
    </div>
  );
}

function SectionLead({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)]">{eyebrow}</p>
      <h2 className="font-serif text-[30px] font-light tracking-[-0.01em] text-foreground">{title}</h2>
      <p className="max-w-3xl text-sm leading-[1.7] text-muted-foreground">{description}</p>
    </div>
  );
}

function ChartCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-border p-0">
      <div className="border-b border-border/70 px-5 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)]">{eyebrow}</p>
        <h2 className="mt-2 font-serif text-[28px] font-light tracking-[-0.01em] text-foreground">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-[1.7] text-muted-foreground">{description}</p>
      </div>
      <div className="px-5 py-5">{children}</div>
    </Card>
  );
}

function LeaseListPanel({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-border p-0">
      <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)]">{eyebrow}</p>
          <h2 className="mt-2 font-serif text-[28px] font-light tracking-[-0.01em] text-foreground">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-[1.7] text-muted-foreground">{description}</p>
        </div>
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] transition-colors hover:text-foreground"
        >
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {children}
    </Card>
  );
}

const MINI_TONE: Record<
  'emerald' | 'slate' | 'violet' | 'amber',
  { stripe: string; icon: string }
> = {
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
  tone: keyof typeof MINI_TONE;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden border border-border bg-card px-4 py-4 transition-colors hover:bg-[color:var(--muted)]/50">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-0.5', MINI_TONE[tone].stripe)} />
      <div className="flex items-center justify-between gap-4 pl-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
          <div className="mt-1 font-serif text-[30px] font-light leading-none tracking-[-0.02em] text-foreground">
            {value}
          </div>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center border opacity-70 transition-opacity group-hover:opacity-100 [&_svg]:size-5',
            MINI_TONE[tone].icon,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  const maxValue = Math.max(1, ...data.flatMap((point) => [point.invoicedCents, point.paidCents]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <LegendSwatch label="Invoiced" tone="primary" />
        <LegendSwatch label="Paid" tone="emerald" />
      </div>
      <div className="grid min-h-[17rem] grid-cols-6 gap-4">
        {data.map((point) => (
          <div key={point.label} className="flex h-full flex-col justify-end gap-3">
            <div className="flex flex-1 items-end justify-center gap-2">
              <TrendBar
                value={point.invoicedCents}
                maxValue={maxValue}
                tone="primary"
                label={`${point.label} invoiced ${formatZar(point.invoicedCents)}`}
              />
              <TrendBar
                value={point.paidCents}
                maxValue={maxValue}
                tone="emerald"
                label={`${point.label} paid ${formatZar(point.paidCents)}`}
              />
            </div>
            <div className="space-y-1 text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {point.label}
              </div>
              <div className="text-xs text-muted-foreground">{formatZar(point.invoicedCents)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendBar({
  value,
  maxValue,
  tone,
  label,
}: {
  value: number;
  maxValue: number;
  tone: 'primary' | 'emerald';
  label: string;
}) {
  const height = value > 0 ? Math.max(6, Math.round((value / maxValue) * 100)) : 0;

  return (
    <div className="flex h-full w-full items-end" aria-label={label} title={label}>
      <div className="h-full w-full border border-border/70 bg-[color:var(--muted)]/35 p-1">
        <div
          className={cn(
            'w-full transition-[height]',
            tone === 'primary' ? 'bg-primary/85' : 'bg-emerald-600/85',
          )}
          style={{ height: `${height}%` }}
        />
      </div>
    </div>
  );
}

const DONUT_SEGMENT_CLASS: Record<StatusSegment['tone'], string> = {
  emerald: 'stroke-emerald-600 dark:stroke-emerald-400',
  amber: 'stroke-[color:var(--accent)]',
  destructive: 'stroke-destructive',
};

function ReceivablesDonut({ segments }: { segments: StatusSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.amountCents, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
      <div className="mx-auto">
        <div className="relative flex items-center justify-center">
          <svg viewBox="0 0 140 140" className="h-44 w-44 -rotate-90">
            <circle cx="70" cy="70" r={radius} className="fill-none stroke-border/70" strokeWidth="14" />
            {segments.map((segment) => {
              if (segment.amountCents <= 0 || total <= 0) return null;
              const length = (segment.amountCents / total) * circumference;
              const circle = (
                <circle
                  key={segment.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  strokeWidth="14"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  className={cn('fill-none', DONUT_SEGMENT_CLASS[segment.tone])}
                />
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Total invoiced
            </div>
            <div className="mt-2 max-w-[7.5rem] font-serif text-[24px] font-light leading-[1.05] tracking-[-0.02em] text-foreground">
              {formatZar(total)}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-start justify-between gap-4 border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'block h-2.5 w-2.5 rounded-full',
                  segment.tone === 'emerald'
                    ? 'bg-emerald-600'
                    : segment.tone === 'amber'
                      ? 'bg-[color:var(--accent)]'
                      : 'bg-destructive',
                )}
              />
              <div>
                <div className="font-medium text-foreground">{segment.label}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {segment.count} account{segment.count === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <div className="text-right font-medium text-foreground">{formatZar(segment.amountCents)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpiryPressureChart({
  buckets,
  windowCount,
  expiredCount,
}: {
  buckets: ExpiryBucket[];
  windowCount: number;
  expiredCount: number;
}) {
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <MiniMetric label="Inside warning window" value={windowCount} tone="amber" />
        <MiniMetric label="Already expired" value={expiredCount} tone="destructive" />
      </div>
      <div className="space-y-4">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="space-y-2">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="font-medium text-foreground">{bucket.label}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {bucket.description}
                </div>
              </div>
              <div className="font-serif text-[24px] font-light leading-none tracking-[-0.02em] text-foreground">
                {bucket.count}
              </div>
            </div>
            <div className="h-2 bg-[color:var(--muted)]">
              <div
                className={cn(
                  'h-full',
                  bucket.tone === 'destructive'
                    ? 'bg-destructive'
                    : bucket.tone === 'amber'
                      ? 'bg-[color:var(--accent)]'
                      : bucket.tone === 'primary'
                        ? 'bg-primary'
                        : 'bg-border',
                )}
                style={{ width: `${(bucket.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendSwatch({ label, tone }: { label: string; tone: 'primary' | 'emerald' }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('block h-2.5 w-2.5', tone === 'primary' ? 'bg-primary/85' : 'bg-emerald-600/85')} />
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'destructive';
}) {
  return (
    <div className="border border-border bg-[color:var(--muted)]/35 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-2 font-serif text-[30px] font-light leading-none tracking-[-0.02em]',
          tone === 'amber' ? 'text-[color:var(--accent)]' : 'text-destructive',
        )}
      >
        {value}
      </div>
    </div>
  );
}
