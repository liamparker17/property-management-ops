import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listTenants } from '@/lib/services/tenants';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tenants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'tenant' : 'tenants'}
            {archived === 'true' ? ' (incl. archived)' : ''}.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/tenants?archived=${archived === 'true' ? 'false' : 'true'}`}
            className="inline-flex h-9 items-center rounded-md border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            {archived === 'true' ? 'Hide archived' : 'Show archived'}
          </Link>
          <Link
            href="/tenants/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New tenant
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No tenants yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first tenant to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Leases</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/tenants/${t.id}`} className="font-medium hover:text-primary">
                      {t.firstName} {t.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.email ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t._count.leases}</td>
                  <td className="px-4 py-3">
                    {t.archivedAt ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Archived
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
