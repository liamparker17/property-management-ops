import Link from 'next/link';
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
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <div className="flex gap-2">
          <Link
            href={`/tenants?archived=${archived === 'true' ? 'false' : 'true'}`}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            {archived === 'true' ? 'Hide archived' : 'Show archived'}
          </Link>
          <Link href="/tenants/new" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            New tenant
          </Link>
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Phone</th>
            <th className="p-2">Leases</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                <Link href={`/tenants/${t.id}`} className="font-medium hover:underline">
                  {t.firstName} {t.lastName}
                </Link>
              </td>
              <td className="p-2">{t.email ?? '—'}</td>
              <td className="p-2">{t.phone ?? '—'}</td>
              <td className="p-2">{t._count.leases}</td>
              <td className="p-2">
                {t.archivedAt ? <span className="text-muted-foreground">archived</span> : 'active'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
