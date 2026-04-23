import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MeterForm } from '@/components/forms/meter-form';

export default async function NewMeterPage() {
  const session = await auth();
  if (!session) redirect('/login');
  const role = session.user.role;
  if (role === 'TENANT' || role === 'LANDLORD' || role === 'MANAGING_AGENT') {
    redirect('/dashboard');
  }

  const units = await db.unit.findMany({
    where: { orgId: session.user.orgId, property: { deletedAt: null } },
    select: { id: true, label: true, property: { select: { name: true } } },
    orderBy: [{ property: { name: 'asc' } }, { label: 'asc' }],
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Utilities" title="New meter" description="Register a meter against a unit." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Meter details</CardTitle>
        </CardHeader>
        <CardContent>
          <MeterForm units={units.map((u) => ({ id: u.id, label: u.label, propertyName: u.property.name }))} />
        </CardContent>
      </Card>
    </div>
  );
}
