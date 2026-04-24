import Link from 'next/link';
import { Suspense } from 'react';
import { ClipboardCheck } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listTenantInspections } from '@/lib/services/offboarding';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default async function TenantInspectionsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TenantInspectionsList />
    </Suspense>
  );
}

async function TenantInspectionsList() {
  const session = await auth();
  const rows = await listTenantInspections(session!.user.id);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Your records" title="Inspections" description="Move-in and move-out condition reports for your home." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="size-5" />}
          title="No inspections yet"
          description="Your property manager will share inspection records here once scheduled."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-border/60">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/tenant/inspections/${row.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium text-foreground">{row.type}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(row.scheduledAt)}</div>
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
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
