import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUnit } from '@/lib/services/units';
import { OccupancyBadge } from '@/components/occupancy-badge';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { deriveStatus } from '@/lib/services/leases';
import { formatDate, formatZar } from '@/lib/format';

export default async function UnitDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let unit;
  try {
    unit = await getUnit(ctx, id);
  } catch {
    notFound();
  }

  const leasesWithStatus = unit.leases.map((l) => ({
    ...l,
    status: deriveStatus(l, 60),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/properties/${unit.property.id}`} className="text-sm text-muted-foreground hover:underline">
          ← {unit.property.name}
        </Link>
        <h1 className="text-2xl font-semibold">{unit.label}</h1>
        <div className="mt-1 flex items-center gap-3 text-sm">
          <OccupancyBadge state={unit.occupancy.state} />
          {unit.bedrooms > 0 && <span>{unit.bedrooms} bed</span>}
          {unit.bathrooms > 0 && <span>{unit.bathrooms} bath</span>}
          {unit.sizeSqm && <span>{unit.sizeSqm} sqm</span>}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Leases</h2>
        {leasesWithStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leases yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="border-b text-left">
              <tr>
                <th className="p-2">Period</th>
                <th className="p-2">Tenants</th>
                <th className="p-2">Rent</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {leasesWithStatus.map((l) => {
                const primary = l.tenants.find((t) => t.isPrimary)?.tenant;
                const others = l.tenants.filter((t) => !t.isPrimary).map((t) => t.tenant);
                return (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <Link href={`/leases/${l.id}`} className="font-medium hover:underline">
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </Link>
                    </td>
                    <td className="p-2">
                      {primary && (
                        <span>
                          {primary.firstName} {primary.lastName}
                          <span className="ml-1 text-xs text-muted-foreground">(primary)</span>
                        </span>
                      )}
                      {others.length > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          + {others.map((t) => `${t.firstName} ${t.lastName}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="p-2">{formatZar(l.rentAmountCents)}</td>
                    <td className="p-2">
                      <LeaseStatusBadge status={l.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
