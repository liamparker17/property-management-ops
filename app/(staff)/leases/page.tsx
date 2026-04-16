import Link from 'next/link';
import { auth } from '@/lib/auth';
import { listLeases } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate, formatZar } from '@/lib/format';

const STATUSES = ['ALL','DRAFT','ACTIVE','EXPIRING','EXPIRED','TERMINATED','RENEWED'] as const;

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const rows = await listLeases(ctx, {
    status: status && status !== 'ALL' ? (status as 'DRAFT') : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leases</h1>
        <Link href="/leases/new" className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
          New lease
        </Link>
      </div>
      <div className="flex gap-2 text-sm">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === 'ALL' ? '/leases' : `/leases?status=${s}`}
            className={`rounded-full border px-3 py-1 ${
              (status ?? 'ALL') === s ? 'bg-gray-900 text-white' : ''
            }`}
          >
            {s}
          </Link>
        ))}
      </div>
      <table className="w-full border-collapse text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="p-2">Property · Unit</th>
            <th className="p-2">Tenants</th>
            <th className="p-2">Period</th>
            <th className="p-2">Rent</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const primary = l.tenants.find((t) => t.isPrimary)?.tenant;
            return (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                    {l.unit.property.name} · {l.unit.label}
                  </Link>
                </td>
                <td className="p-2">
                  {primary ? `${primary.firstName} ${primary.lastName}` : '—'}
                  {l.tenants.length > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">+{l.tenants.length - 1}</span>
                  )}
                </td>
                <td className="p-2">{formatDate(l.startDate)} → {formatDate(l.endDate)}</td>
                <td className="p-2">{formatZar(l.rentAmountCents)}</td>
                <td className="p-2"><LeaseStatusBadge status={l.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
