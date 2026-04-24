import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getTenantInspection } from '@/lib/services/offboarding';
import { formatDate, formatZar } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InspectionSignDialog } from '@/components/forms/inspection-sign-dialog';

export default async function TenantInspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TenantInspectionDetail id={id} />
    </Suspense>
  );
}

async function TenantInspectionDetail({ id }: { id: string }) {
  const session = await auth();
  const inspection = await getTenantInspection(session!.user.id, id);
  if (!inspection) notFound();

  const canSign = inspection.status === 'COMPLETED' || inspection.status === 'IN_PROGRESS';

  return (
    <div className="space-y-6">
      <Link
        href="/tenant/inspections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to inspections
      </Link>
      <PageHeader
        eyebrow="Inspection"
        title={`${inspection.type} · ${inspection.status}`}
        description={`Scheduled ${formatDate(inspection.scheduledAt)}`}
      />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="space-y-1 text-sm">
            <div className="text-muted-foreground">Status: <span className="font-medium text-foreground">{inspection.status}</span></div>
            {inspection.signedOffAt ? <div className="text-muted-foreground">Signed off {formatDate(inspection.signedOffAt)}</div> : null}
          </div>
          {canSign ? <InspectionSignDialog inspectionId={inspection.id} defaultRole="TENANT" /> : null}
          {inspection.reportKey ? (
            <a
              href={inspection.reportKey}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/40"
            >
              Open PDF
            </a>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Areas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {inspection.areas.length === 0 ? (
            <p className="text-muted-foreground">No areas recorded.</p>
          ) : (
            inspection.areas.map((area) => (
              <div key={area.id} className="rounded-lg border border-border">
                <div className="border-b border-border bg-muted/30 px-4 py-2 font-medium">{area.name}</div>
                <div className="space-y-2 p-4">
                  {area.items.map((item) => (
                    <div key={item.id} className="rounded-md border border-border/70 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{item.label}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{item.condition}</span>
                      </div>
                      {item.note ? <p className="mt-1 text-xs text-muted-foreground">{item.note}</p> : null}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.estimatedCostCents != null ? `Est. cost ${formatZar(item.estimatedCostCents)}` : null}
                        {item.responsibility ? ` · ${item.responsibility}` : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {inspection.signatures.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signatures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {inspection.signatures.map((sig) => (
              <div key={sig.id} className="flex items-baseline justify-between border-b border-border/60 pb-2">
                <span className="font-medium">{sig.signedName}</span>
                <span className="text-xs text-muted-foreground">
                  {sig.signerRole} · {formatDate(sig.signedAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
