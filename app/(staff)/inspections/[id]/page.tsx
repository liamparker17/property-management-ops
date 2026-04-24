import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getInspection } from '@/lib/services/inspections';
import { formatDate, formatZar } from '@/lib/format';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { InspectionAreaForm } from '@/components/forms/inspection-area-form';
import { InspectionItemForm } from '@/components/forms/inspection-item-form';
import { InspectionSignDialog } from '@/components/forms/inspection-sign-dialog';
import { InspectionPhotoUploader } from '@/components/forms/inspection-photo-uploader';

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <InspectionDetail id={id} />
    </Suspense>
  );
}

async function InspectionDetail({ id }: { id: string }) {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };

  let inspection: Awaited<ReturnType<typeof getInspection>>;
  try {
    inspection = await getInspection(ctx, id);
  } catch {
    notFound();
  }

  const canEdit = inspection.status !== 'SIGNED_OFF' && inspection.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      <Link
        href="/inspections"
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
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <Detail label="Type" value={inspection.type} />
          <Detail label="Status" value={inspection.status} />
          <Detail label="Started" value={inspection.startedAt ? formatDate(inspection.startedAt) : '—'} />
          <Detail label="Completed" value={inspection.completedAt ? formatDate(inspection.completedAt) : '—'} />
          <Detail label="Signed off" value={inspection.signedOffAt ? formatDate(inspection.signedOffAt) : '—'} />
          <Detail label="Summary" value={inspection.summary ?? '—'} />
        </CardContent>
        <CardContent className="flex flex-wrap gap-2 border-t border-border/60 p-4">
          {inspection.status === 'SCHEDULED' ? (
            <form action={`/api/inspections/${inspection.id}/start`} method="post">
              <Button size="sm">Start inspection</Button>
            </form>
          ) : null}
          {inspection.status === 'IN_PROGRESS' ? (
            <form action={`/api/inspections/${inspection.id}/complete`} method="post">
              <Button size="sm">Complete inspection</Button>
            </form>
          ) : null}
          {(inspection.status === 'COMPLETED' || inspection.status === 'IN_PROGRESS') ? (
            <InspectionSignDialog
              inspectionId={inspection.id}
              defaultRole={session!.user.role}
            />
          ) : null}
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
        <CardContent className="space-y-6">
          {canEdit ? (
            <InspectionAreaForm inspectionId={inspection.id} nextOrderIndex={inspection.areas.length} />
          ) : null}
          {inspection.areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No areas captured yet.</p>
          ) : (
            inspection.areas
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((area) => (
                <div key={area.id} className="rounded-lg border border-border">
                  <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-medium">{area.name}</div>
                  <div className="space-y-3 p-4">
                    {area.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No items captured.</p>
                    ) : (
                      area.items.map((item) => (
                        <div key={item.id} className="rounded-md border border-border/70 p-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-medium">{item.label}</span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                              {item.condition}
                            </span>
                          </div>
                          {item.note ? <p className="mt-1 text-xs text-muted-foreground">{item.note}</p> : null}
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.estimatedCostCents != null ? `Est. cost ${formatZar(item.estimatedCostCents)}` : null}
                            {item.responsibility ? ` · ${item.responsibility}` : null}
                          </div>
                          {item.photos.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {item.photos.map((photo) => (
                                <a
                                  key={photo.id}
                                  href={photo.storageKey.startsWith('http') ? photo.storageKey : `https://blob.vercel-storage.com/${photo.storageKey}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-xs text-primary hover:underline"
                                >
                                  Photo {photo.id.slice(-6)}
                                </a>
                              ))}
                            </div>
                          ) : null}
                          {canEdit ? (
                            <div className="mt-3">
                              <InspectionPhotoUploader itemId={item.id} />
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                    {canEdit ? <InspectionItemForm areaId={area.id} /> : null}
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

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
