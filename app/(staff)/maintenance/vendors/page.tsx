import Link from 'next/link';
import { Wrench } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listVendors } from '@/lib/services/vendors';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const includeArchived = archived === '1';
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listVendors(ctx, { includeArchived });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Vendors"
        description={`${rows.length} ${rows.length === 1 ? 'vendor' : 'vendors'}${includeArchived ? ' (including archived)' : ''}.`}
        actions={
          <Link href="/maintenance/vendors/new" className={buttonVariants()}>
            Add vendor
          </Link>
        }
      />

      <div className="flex gap-1 rounded-full border border-border bg-card p-1 shadow-card w-fit">
        <Link
          href="/maintenance/vendors"
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
            !includeArchived
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          Active
        </Link>
        <Link
          href="/maintenance/vendors?archived=1"
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
            includeArchived
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          Show archived
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wrench className="size-5" />}
          title="No vendors yet"
          description="Add your first maintenance contractor to begin dispatching work."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Categories</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((v) => (
                  <tr
                    key={v.id}
                    className="cursor-pointer transition-colors duration-150 even:bg-muted/15 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/maintenance/vendors/${v.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {v.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.contactName ?? '—'}
                      {v.contactEmail ? ` · ${v.contactEmail}` : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.categories.length === 0 ? '—' : v.categories.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.archivedAt ? 'Archived' : 'Active'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
