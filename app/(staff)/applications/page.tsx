import Link from 'next/link';
import { Suspense } from 'react';
import { ClipboardList, Plus, Search } from 'lucide-react';

import { auth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { listApplications } from '@/lib/services/applications';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const STAGES = ['ALL', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VETTING', 'APPROVED', 'DECLINED', 'CONVERTED', 'WITHDRAWN'] as const;

type StageKey = (typeof STAGES)[number];

type ApplicationsPageProps = {
  searchParams: Promise<{
    stage?: string;
    assignedReviewerId?: string;
    q?: string;
  }>;
};

function isStageKey(value: string | undefined): value is StageKey {
  return Boolean(value && STAGES.includes(value as StageKey));
}

function stageTone(stage: string) {
  switch (stage) {
    case 'APPROVED':
      return 'bg-emerald-500/10 text-emerald-800 ring-emerald-600/20 dark:text-emerald-300';
    case 'DECLINED':
    case 'WITHDRAWN':
      return 'bg-destructive/10 text-destructive ring-destructive/25';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
    case 'VETTING':
      return 'bg-[color:var(--accent)]/10 text-foreground ring-[color:var(--accent)]/30';
    case 'CONVERTED':
      return 'bg-primary/10 text-primary ring-primary/20 dark:text-primary-foreground';
    default:
      return 'bg-muted text-muted-foreground ring-border';
  }
}

function tpnTone(status: string | null | undefined) {
  switch (status) {
    case 'RECEIVED':
      return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400';
    case 'WAIVED':
      return 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300';
    case 'FAILED':
      return 'bg-destructive/10 text-destructive ring-destructive/25';
    case 'REQUESTED':
      return 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300';
    default:
      return 'bg-muted text-muted-foreground ring-border';
  }
}

function recommendationTone(recommendation: string | null | undefined) {
  switch (recommendation) {
    case 'PASS':
      return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400';
    case 'CAUTION':
      return 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300';
    case 'DECLINE':
      return 'bg-destructive/10 text-destructive ring-destructive/25';
    default:
      return 'bg-muted text-muted-foreground ring-border';
  }
}

function labelize(value: string) {
  return value.replaceAll('_', ' ');
}

function StagePill({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset ${stageTone(stage)}`}
    >
      <span className="h-2 w-2 rounded-full bg-current/70" />
      {labelize(stage)}
    </span>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset ${tone}`}
      title={label}
    >
      <span className="h-2 w-2 rounded-full bg-current/70" />
      {value}
    </span>
  );
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const filters = await searchParams;

  return (
    <Suspense fallback={<ApplicationsPageSkeleton />}>
      <ApplicationsPageContent searchParams={filters} />
    </Suspense>
  );
}

async function ApplicationsPageContent({
  searchParams,
}: {
  searchParams: {
    stage?: string;
    assignedReviewerId?: string;
    q?: string;
  };
}) {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };

  const activeStage = isStageKey(searchParams.stage) ? searchParams.stage : 'ALL';
  const activeReviewerId = searchParams.assignedReviewerId?.trim() ?? '';
  const query = searchParams.q?.trim() ?? '';

  const [rows, allRows] = await Promise.all([
    listApplications(ctx, {
      stage: activeStage !== 'ALL' ? activeStage : undefined,
      assignedReviewerId: activeReviewerId || undefined,
      q: query || undefined,
    }),
    listApplications(ctx, {}),
  ]);

  const reviewerOptions = allRows
    .filter((row) => row.reviewer)
    .reduce<Array<{ id: string; label: string }>>((acc, row) => {
      const reviewer = row.reviewer;
      if (!reviewer || acc.some((option) => option.id === reviewer.id)) return acc;
      acc.push({
        id: reviewer.id,
        label: reviewer.name ?? reviewer.email ?? reviewer.id,
      });
      return acc;
    }, [])
    .sort((a, b) => a.label.localeCompare(b.label));

  const hasFilters = activeStage !== 'ALL' || Boolean(activeReviewerId) || Boolean(query);

  function buildHref(next: Partial<{ stage: string; assignedReviewerId: string; q: string }>) {
    const params = new URLSearchParams();
    const stage = next.stage ?? activeStage;
    const reviewer = next.assignedReviewerId ?? activeReviewerId;
    const q = next.q ?? query;

    if (stage && stage !== 'ALL') params.set('stage', stage);
    if (reviewer) params.set('assignedReviewerId', reviewer);
    if (q) params.set('q', q);

    const value = params.toString();
    return value ? `/applications?${value}` : '/applications';
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Applications"
        title="Applications"
        description={[
          `${rows.length} ${rows.length === 1 ? 'application' : 'applications'}`,
          activeStage !== 'ALL' ? labelize(activeStage).toLowerCase() : null,
          activeReviewerId ? 'reviewer filtered' : null,
          query ? `search "${query}"` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <Link href="/applications/new" className={cn(buttonVariants(), 'gap-1.5')}>
            <Plus className="h-4 w-4" />
            New application
          </Link>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1 shadow-card">
            {STAGES.map((stage) => (
              <Link
                key={stage}
                href={buildHref({ stage })}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
                  activeStage === stage
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {labelize(stage)}
              </Link>
            ))}
          </div>

          <form action="/applications" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search applicant, email, phone, or source"
                className="pl-9"
              />
            </div>

            <select
              name="assignedReviewerId"
              defaultValue={activeReviewerId}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">All reviewers</option>
              {reviewerOptions.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id}>
                  {reviewer.label}
                </option>
              ))}
            </select>

            {activeStage !== 'ALL' && <input type="hidden" name="stage" value={activeStage} />}

            <Button type="submit" className="gap-1.5">
              <Search className="h-4 w-4" />
              Apply
            </Button>

            <Link href="/applications" className={cn(buttonVariants({ variant: 'outline' }))}>
              Clear
            </Link>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-5" />}
          title={hasFilters ? 'No applications match these filters' : 'No applications yet'}
          description={
            hasFilters
              ? 'Try a different stage, reviewer, or search term to widen the pipeline view.'
              : 'Capture your first prospect application to start the review flow.'
          }
          action={
            hasFilters ? (
              <Link href="/applications" className={cn(buttonVariants({ variant: 'outline' }))}>
                Clear filters
              </Link>
            ) : (
              <Link href="/applications/new" className={cn(buttonVariants(), 'gap-1.5')}>
                <Plus className="h-4 w-4" />
                Capture application
              </Link>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="px-4 py-3">Applicant</TableHead>
                <TableHead className="px-4 py-3">Property</TableHead>
                <TableHead className="px-4 py-3">Move-in</TableHead>
                <TableHead className="px-4 py-3">Reviewer</TableHead>
                <TableHead className="px-4 py-3">TPN</TableHead>
                <TableHead className="px-4 py-3">Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="even:bg-muted/15 hover:bg-muted/40"
                >
                  <TableCell className="px-4 py-3 align-top">
                    <Link href={`/applications/${row.id}`} className="font-medium text-foreground hover:text-primary">
                      {row.applicant.firstName} {row.applicant.lastName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{row.applicant.email}</div>
                    <div className="text-xs text-muted-foreground">{row.sourceChannel ?? 'Walk-in / manual'}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-muted-foreground">
                    <div>{row.property?.name ?? 'Unassigned property'}</div>
                    <div className="text-xs text-muted-foreground">{row.unit?.label ?? 'No unit selected'}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-muted-foreground">
                    {row.requestedMoveIn ? formatDate(row.requestedMoveIn) : 'Not set'}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-muted-foreground">
                    {row.reviewer?.name ?? row.reviewer?.email ?? 'Unassigned'}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusPill
                        label="TPN status"
                        value={labelize(row.tpnCheck?.status ?? 'NOT_STARTED')}
                        tone={tpnTone(row.tpnCheck?.status)}
                      />
                      {row.tpnCheck?.recommendation ? (
                        <StatusPill
                          label="TPN recommendation"
                          value={labelize(row.tpnCheck.recommendation)}
                          tone={recommendationTone(row.tpnCheck.recommendation)}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    <StagePill stage={row.stage} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function ApplicationsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 border-b border-border/60 pb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-6 gap-4 border-b border-border/60 px-4 py-4 last:border-b-0">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
