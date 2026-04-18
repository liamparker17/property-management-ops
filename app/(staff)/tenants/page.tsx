import Link from 'next/link';
import { Plus, UserPlus, Users } from 'lucide-react';

import { auth } from '@/lib/auth';
import { listTenants } from '@/lib/services/tenants';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listTenants(ctx, { includeArchived: archived === 'true' });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Tenants"
        description={`${rows.length} ${rows.length === 1 ? 'tenant' : 'tenants'}${archived === 'true' ? ' (incl. archived)' : ''}.`}
        actions={
          <>
            <Link
              href={`/tenants?archived=${archived === 'true' ? 'false' : 'true'}`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
            >
              {archived === 'true' ? 'Hide archived' : 'Show archived'}
            </Link>
            <Link href="/tenants/new" className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
              <Plus className="h-4 w-4" />
              New tenant
            </Link>
            <Link href="/tenants/onboard" className={cn(buttonVariants(), 'gap-1.5')}>
              <UserPlus className="h-4 w-4" />
              Onboard tenant
            </Link>
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No tenants yet"
          description="Add your first tenant to get started."
          action={
            <Link href="/tenants/onboard" className={cn(buttonVariants(), 'gap-1.5')}>
              <UserPlus className="h-4 w-4" />
              Onboard tenant
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Leases</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer transition-colors duration-150 even:bg-muted/15 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/tenants/${t.id}`} className="group flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-xs font-semibold text-primary">
                          {initials(t.firstName, t.lastName)}
                        </div>
                        <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                          {t.firstName} {t.lastName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t._count.leases}</td>
                    <td className="px-4 py-3">
                      {t.archivedAt ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20 dark:text-slate-300">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          Archived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
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
