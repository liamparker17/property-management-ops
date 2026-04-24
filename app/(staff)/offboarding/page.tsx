import Link from 'next/link';
import { Suspense } from 'react';
import { DoorClosed } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listOffboardingCases } from '@/lib/services/offboarding';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default async function OffboardingListPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <OffboardingList />
    </Suspense>
  );
}

async function OffboardingList() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listOffboardingCases(ctx);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations" title="Offboarding" description="Tenant move-out cases and deposit settlements." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<DoorClosed className="size-5" />}
          title="No offboarding cases"
          description="Cases open automatically when an active lease is terminated."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-border/60">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/offboarding/${row.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium text-foreground">Lease {row.leaseId.slice(-6)}</div>
                    <div className="text-xs text-muted-foreground">Opened {formatDate(row.openedAt)}</div>
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
