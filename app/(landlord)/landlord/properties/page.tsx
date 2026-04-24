import Link from 'next/link';

import { MapPanel } from '@/components/analytics/maps/map-panel';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { formatZar } from '@/lib/format';
import { getLandlordPortfolio } from '@/lib/services/landlord-analytics';

export default async function LandlordPropertiesPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const data = await getLandlordPortfolio(ctx);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Landlord Portal" title="Properties" description="Your mapped portfolio with occupancy and collection indicators." />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="overflow-hidden border border-border p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--muted)]/35 text-left">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Occupancy</th>
                  <th className="px-4 py-3">Maintenance</th>
                  <th className="px-4 py-3">Arrears</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <Link href={row.href} className="font-medium text-foreground hover:underline">
                        {row.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{row.suburb}, {row.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.totalUnits > 0 ? Math.round((row.occupiedUnits / row.totalUnits) * 100) : 0}%
                    </td>
                    <td className="px-4 py-3">{row.openMaintenance}</td>
                    <td className="px-4 py-3">{formatZar(row.arrearsCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <MapPanel title="Property footprint" pins={data.pins} />
      </div>
    </div>
  );
}
