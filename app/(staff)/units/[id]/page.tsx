import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bed, Bath, Ruler } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getUnit } from '@/lib/services/units';
import { OccupancyBadge } from '@/components/occupancy-badge';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Link
        href={`/properties/${unit.property.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {unit.property.name}
      </Link>
      <PageHeader
        eyebrow="Unit"
        title={unit.label}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <OccupancyBadge state={unit.occupancy.state} />
            {unit.bedrooms > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Bed className="size-3.5" />
                {unit.bedrooms} bed
              </span>
            )}
            {unit.bathrooms > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Bath className="size-3.5" />
                {unit.bathrooms} bath
              </span>
            )}
            {unit.sizeSqm && (
              <span className="inline-flex items-center gap-1.5">
                <Ruler className="size-3.5" />
                {unit.sizeSqm} sqm
              </span>
            )}
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Leases</CardTitle>
        </CardHeader>
        <CardContent>
          {leasesWithStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2.5">Period</th>
                    <th className="px-3 py-2.5">Tenants</th>
                    <th className="px-3 py-2.5">Rent</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leasesWithStatus.map((l) => {
                    const primary = l.tenants.find((t) => t.isPrimary)?.tenant;
                    const others = l.tenants.filter((t) => !t.isPrimary).map((t) => t.tenant);
                    return (
                      <tr
                        key={l.id}
                        className="border-b transition-colors even:bg-muted/15 hover:bg-muted/30 last:border-b-0"
                      >
                        <td className="px-3 py-3">
                          <Link href={`/leases/${l.id}`} className="font-medium text-foreground hover:underline">
                            {formatDate(l.startDate)} → {formatDate(l.endDate)}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          {primary && (
                            <span className="text-foreground">
                              {primary.firstName} {primary.lastName}
                              <span className="ml-1.5 text-xs text-muted-foreground">Primary</span>
                            </span>
                          )}
                          {others.length > 0 && (
                            <span className="ml-2 text-muted-foreground">
                              + {others.map((t) => `${t.firstName} ${t.lastName}`).join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 tabular-nums">{formatZar(l.rentAmountCents)}</td>
                        <td className="px-3 py-3">
                          <LeaseStatusBadge status={l.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
