import Link from 'next/link';
import { Building2 } from 'lucide-react';

import { MapPanel } from '@/components/analytics/maps/map-panel';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { userToRouteCtx } from '@/lib/auth/page-ctx';
import { formatZar } from '@/lib/format';
import { getStaffPortfolio } from '@/lib/services/staff-analytics';

export default async function StaffPortfolioPage() {
  const session = await auth();
  const ctx = userToRouteCtx(session!.user);
  const data = await getStaffPortfolio(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard Module"
        title="Portfolio"
        description="Property-level occupancy, maintenance, arrears, and mapped portfolio coverage."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="overflow-hidden border border-border p-0">
          {data.rows.length === 0 ? (
            <EmptyState
              icon={<Building2 className="size-5" />}
              title="No properties yet"
              description="Add your first property to start tracking occupancy and arrears."
              action={
                <Link href="/properties/new" className={buttonVariants()}>
                  New property
                </Link>
              }
            />
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--muted)]/40 text-left">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Occupancy</th>
                  <th className="px-4 py-3">Open maintenance</th>
                  <th className="px-4 py-3">Arrears</th>
                  <th className="px-4 py-3">Gross rent</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.suburb}, {row.city}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.occupancyPct}%</td>
                    <td className="px-4 py-3">{row.openMaintenance}</td>
                    <td className="px-4 py-3">{formatZar(row.arrearsCents)}</td>
                    <td className="px-4 py-3">{formatZar(row.grossRentCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </Card>
        <MapPanel title="Mapped properties" eyebrow="Map" pins={data.pins} />
      </div>
    </div>
  );
}
