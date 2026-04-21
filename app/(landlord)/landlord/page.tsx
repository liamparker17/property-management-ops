import Link from 'next/link';
import { auth } from '@/lib/auth';
import {
  getLandlordPortfolioSummary,
  listLandlordProperties,
} from '@/lib/services/landlord-portal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Landlord Portfolio' };

export default async function LandlordDashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [summary, properties] = await Promise.all([
    getLandlordPortfolioSummary(userId),
    listLandlordProperties(userId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.propertyCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.unitCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeLeaseCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.openMaintenance}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Properties</CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No properties assigned to you yet. Your property manager will add them here.
            </p>
          ) : (
            <ul className="divide-y">
              {properties.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/landlord/properties/${p.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.addressLine1}, {p.suburb}, {p.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{p._count.units} unit{p._count.units === 1 ? '' : 's'}</p>
                    {p.assignedAgent && (
                      <p className="text-xs text-muted-foreground">
                        Agent: {p.assignedAgent.name}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
