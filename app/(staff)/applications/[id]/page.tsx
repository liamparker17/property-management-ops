import Link from 'next/link';
import { Suspense } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  MessageSquare,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { notFound } from 'next/navigation';

import { auth } from '@/lib/auth';
import { formatDate, formatZar } from '@/lib/format';
import { getApplication } from '@/lib/services/applications';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ApplicationDetailActions, ApplicationDocumentsPanel, ApplicationNotesPanel } from '@/components/forms/application-detail-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { ConvertApplicationDialog } from '@/components/forms/convert-application-dialog';

const TABS = ['overview', 'tpn', 'documents', 'notes'] as const;

type TabKey = (typeof TABS)[number];

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function isTabKey(value: string | undefined): value is TabKey {
  return Boolean(value && TABS.includes(value as TabKey));
}

function labelize(value: string) {
  return value.replaceAll('_', ' ');
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

function StatusPill({
  value,
  tone,
}: {
  value: string;
  tone: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ring-1 ring-inset ${tone}`}
    >
      <span className="h-2 w-2 rounded-full bg-current/70" />
      {value}
    </span>
  );
}

function buildStageHistory(application: Awaited<ReturnType<typeof getApplication>>) {
  const items = [
    {
      label: 'Application captured',
      date: application.createdAt,
      tone: 'bg-primary/10 text-primary',
    },
  ];

  if (application.tpnCheck?.requestedAt) {
    items.push({
      label: 'TPN requested',
      date: application.tpnCheck.requestedAt,
      tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    });
  }

  if (application.tpnCheck?.receivedAt) {
    items.push({
      label: 'TPN received',
      date: application.tpnCheck.receivedAt,
      tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    });
  }

  if (application.decidedAt) {
    items.push({
      label: `Decision: ${labelize(application.decision)}`,
      date: application.decidedAt,
      tone:
        application.decision === 'APPROVED'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-destructive/10 text-destructive',
    });
  }

  if (application.stage === 'CONVERTED') {
    items.push({
      label: 'Converted to tenant',
      date: application.updatedAt,
      tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    });
  } else if (application.updatedAt.getTime() !== application.createdAt.getTime()) {
    items.push({
      label: `Current stage: ${labelize(application.stage)}`,
      date: application.updatedAt,
      tone: 'bg-muted text-muted-foreground',
    });
  }

  return items;
}

export default async function ApplicationDetailPage({ params, searchParams }: ApplicationDetailPageProps) {
  const [{ id }, rawSearchParams] = await Promise.all([params, searchParams]);
  const activeTab = isTabKey(rawSearchParams.tab) ? rawSearchParams.tab : 'overview';

  return (
    <Suspense fallback={<ApplicationDetailSkeleton />}>
      <ApplicationDetailContent id={id} activeTab={activeTab} />
    </Suspense>
  );
}

async function ApplicationDetailContent({
  id,
  activeTab,
}: {
  id: string;
  activeTab: TabKey;
}) {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };

  let application;
  try {
    application = await getApplication(ctx, id);
  } catch {
    notFound();
  }

  const stageHistory = buildStageHistory(application);
  const tpnStatus = application.tpnCheck?.status ?? 'NOT_STARTED';
  const tpnRecommendation = application.tpnCheck?.recommendation ?? null;
  const affordabilityRatio =
    application.affordabilityRatio != null ? `${application.affordabilityRatio.toFixed(2)}x` : 'Pending';

  const actionSnapshot = {
    id: application.id,
    stage: application.stage,
    decision: application.decision,
    decisionReason: application.decisionReason,
    decidedAt: application.decidedAt ? application.decidedAt.toISOString() : null,
    assignedReviewerId: application.assignedReviewerId,
    reviewerName: application.reviewer?.name ?? application.reviewer?.email ?? null,
    convertedTenantId: application.convertedTenantId,
    requestedMoveIn: application.requestedMoveIn ? application.requestedMoveIn.toISOString() : null,
    applicant: {
      firstName: application.applicant.firstName,
      lastName: application.applicant.lastName,
      tpnConsentGiven: application.applicant.tpnConsentGiven,
      tpnConsentAt: application.applicant.tpnConsentAt ? application.applicant.tpnConsentAt.toISOString() : null,
    },
    tpnCheck: application.tpnCheck
      ? {
          status: application.tpnCheck.status,
          recommendation: application.tpnCheck.recommendation ?? null,
          summary: application.tpnCheck.summary ?? null,
          requestedAt: application.tpnCheck.requestedAt ? application.tpnCheck.requestedAt.toISOString() : null,
          receivedAt: application.tpnCheck.receivedAt ? application.tpnCheck.receivedAt.toISOString() : null,
          reportBlobKey: application.tpnCheck.reportBlobKey ?? null,
          reportPayload: application.tpnCheck.reportPayload ?? null,
          waivedReason: application.tpnCheck.waivedReason ?? null,
          waivedById: application.tpnCheck.waivedById ?? null,
        }
      : null,
  };

  const convertDefaults = {
    requestedMoveIn: application.requestedMoveIn ? formatDate(application.requestedMoveIn) : null,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to applications
        </Link>

        <PageHeader
          eyebrow="Applications"
          title={`${application.applicant.firstName} ${application.applicant.lastName}`}
          description={`${application.applicant.email} · ${application.applicant.phone}`}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pipeline status
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill value={labelize(application.stage)} tone={stageTone(application.stage)} />
              <StatusPill value={`TPN ${labelize(tpnStatus)}`} tone={tpnTone(tpnStatus)} />
              {tpnRecommendation ? (
                <StatusPill
                  value={`Recommendation ${labelize(tpnRecommendation)}`}
                  tone={recommendationTone(tpnRecommendation)}
                />
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Captured {formatDate(application.createdAt)}
              {application.reviewer ? ` · Reviewer ${application.reviewer.name ?? application.reviewer.email}` : ' · Unassigned reviewer'}
            </p>
          </div>

          {application.stage === 'APPROVED' ? (
            <ConvertApplicationDialog applicationId={application.id} defaults={convertDefaults} />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1 shadow-card">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/applications/${application.id}?tab=${tab}`}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {tab === 'tpn' ? 'TPN' : labelize(tab)}
          </Link>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-center gap-2.5 space-y-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserRound className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Applicant</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                <Detail label="Phone" value={application.applicant.phone} />
                <Detail label="Email" value={application.applicant.email} />
                <Detail label="ID / passport" value={application.applicant.idNumber ?? 'Not captured'} />
                <Detail label="Employer" value={application.applicant.employer ?? 'Not captured'} />
                <Detail
                  label="Net income"
                  value={
                    application.applicant.netMonthlyIncomeCents != null
                      ? formatZar(application.applicant.netMonthlyIncomeCents)
                      : 'Not captured'
                  }
                />
                <Detail
                  label="Gross income"
                  value={
                    application.applicant.grossMonthlyIncomeCents != null
                      ? formatZar(application.applicant.grossMonthlyIncomeCents)
                      : 'Not captured'
                  }
                />
                <Detail
                  label="TPN consent"
                  value={
                    application.applicant.tpnConsentGiven
                      ? `Captured${application.applicant.tpnConsentAt ? ` on ${formatDate(application.applicant.tpnConsentAt)}` : ''}`
                      : 'Not captured'
                  }
                />
                <Detail
                  label="Requested move-in"
                  value={application.requestedMoveIn ? formatDate(application.requestedMoveIn) : 'Not set'}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2.5 space-y-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Home className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Property and unit</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                <Detail label="Property" value={application.property?.name ?? application.unit?.property.name ?? 'Unassigned'} />
                <Detail label="Unit" value={application.unit?.label ?? 'Not selected'} />
                <Detail label="Source channel" value={application.sourceChannel ?? 'Walk-in / manual'} />
                <Detail label="Reviewer" value={application.reviewer?.name ?? application.reviewer?.email ?? 'Unassigned'} />
                {application.convertedTenantId ? (
                  <Detail
                    label="Converted tenant"
                    value={
                      <Link href={`/tenants/${application.convertedTenantId}`} className="text-primary hover:underline">
                        Open tenant profile
                      </Link>
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <ApplicationDetailActions
              mode="overview"
              application={actionSnapshot}
              currentUser={{
                id: session!.user.id,
                name: session!.user.name ?? null,
                email: session!.user.email ?? null,
              }}
            />

            <Card>
              <CardHeader className="flex-row items-center gap-2.5 space-y-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Affordability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <Detail label="Affordability ratio" value={affordabilityRatio} />
                <Detail
                  label="Decision"
                  value={application.decision === 'PENDING' ? 'Awaiting decision' : labelize(application.decision)}
                />
                <Detail
                  label="Decision note"
                  value={application.decisionReason ?? 'No decision note yet'}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2.5 space-y-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Stage history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stageHistory.map((item) => (
                  <div key={`${item.label}-${item.date.toISOString()}`} className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.tone}`}>
                      <span className="h-2 w-2 rounded-full bg-current/80" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(item.date)}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === 'tpn' ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader className="flex-row items-center gap-2.5 space-y-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">TPN check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <StatusPill value={labelize(tpnStatus)} tone={tpnTone(tpnStatus)} />
                {tpnRecommendation ? (
                  <StatusPill
                    value={labelize(tpnRecommendation)}
                    tone={recommendationTone(tpnRecommendation)}
                  />
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Detail
                  label="Consent"
                  value={application.applicant.tpnConsentGiven ? 'Captured' : 'Still required'}
                />
                <Detail
                  label="Requested at"
                  value={application.tpnCheck?.requestedAt ? formatDate(application.tpnCheck.requestedAt) : 'Not yet'}
                />
                <Detail
                  label="Received at"
                  value={application.tpnCheck?.receivedAt ? formatDate(application.tpnCheck.receivedAt) : 'Not yet'}
                />
                <Detail
                  label="Waived by"
                  value={application.tpnCheck?.waivedById ?? 'Not waived'}
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Summary</div>
                <p className="mt-2 text-sm text-foreground">
                  {application.tpnCheck?.summary ??
                    (tpnStatus === 'REQUESTED'
                      ? 'Awaiting TPN response.'
                      : tpnStatus === 'FAILED'
                        ? 'The last TPN request failed. Retry once credentials or payload issues are resolved.'
                        : tpnStatus === 'WAIVED'
                          ? application.tpnCheck?.waivedReason ?? 'TPN was waived for this application.'
                          : 'No TPN report has been received yet.')}
                </p>
              </div>

              {application.tpnCheck?.reportBlobKey ? (
                <div className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stored report</div>
                  <div className="mt-2">
                    <a
                      href={application.tpnCheck.reportBlobKey}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Open stored report
                    </a>
                  </div>
                </div>
              ) : null}

              {application.tpnCheck?.reportPayload ? (
                <details className="rounded-lg border border-border bg-card px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    View full TPN payload
                  </summary>
                  <pre className="mt-3 overflow-x-auto rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                    {JSON.stringify(application.tpnCheck.reportPayload, null, 2)}
                  </pre>
                </details>
              ) : null}
            </CardContent>
          </Card>

          <ApplicationDetailActions
            mode="tpn"
            application={actionSnapshot}
            currentUser={{
              id: session!.user.id,
              name: session!.user.name ?? null,
              email: session!.user.email ?? null,
            }}
          />
        </div>
      ) : null}

      {activeTab === 'documents' ? (
        <div className="space-y-6">
          <ApplicationDocumentsPanel applicationId={application.id} />

          {application.documents.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-5" />}
              title="No application documents yet"
              description="Upload payslips, IDs, or supporting paperwork for the review file."
            />
          ) : (
            <Card className="overflow-hidden p-0">
              <ul className="divide-y divide-border/60">
                {application.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{doc.filename}</div>
                      <div className="text-xs text-muted-foreground">{doc.mimeType}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(doc.sizeBytes / 1024).toFixed(0)} KB · {formatDate(doc.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      ) : null}

      {activeTab === 'notes' ? (
        <div className="space-y-6">
          <ApplicationNotesPanel applicationId={application.id} />

          {application.notes.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="size-5" />}
              title="No internal notes yet"
              description="Capture review context, owner updates, or follow-ups so the team can keep the file moving."
            />
          ) : (
            <Card>
              <CardContent className="space-y-3 p-4">
                {application.notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-border px-4 py-3">
                    <div className="text-sm text-foreground">{note.body}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {note.author.name ?? note.author.email ?? 'Unknown'} · {formatDate(note.createdAt)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ApplicationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-3 border-b border-border/60 pb-7">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-36 rounded-full" />
          </div>
          <Skeleton className="h-8 w-40" />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-28 rounded-full" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
