import Link from 'next/link';
import { Suspense } from 'react';
import { ClipboardCheck } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listInspections } from '@/lib/services/inspections';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default async function InspectionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const filters = await searchParams;
  return (
    <Suspense fallback={<ListSkeleton />}>
      <InspectionsList filters={filters} />
    </Suspense>
  );
}

async function InspectionsList({ filters }: { filters: { status?: string; type?: string } }) {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listInspections(ctx, {
    status: filters.status as any,
    type: filters.type as any,
  });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations" title="Inspections" description="Move-in, move-out and interim records." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="size-5" />}
          title="No inspections yet"
          description="Schedule a move-in or move-out inspection from the lease detail page."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-border/60">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/inspections/${row.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium text-foreground">{row.type}</div>
                    <div className="text-xs text-muted-foreground">
                      Lease {row.leaseId.slice(-6)} · {formatDate(row.scheduledAt)}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {row.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <Card>
        <CardContent className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
