import { auth } from '@/lib/auth';
import { listUnits } from '@/lib/services/units';
import { listTenants } from '@/lib/services/tenants';
import { LeaseForm } from '@/components/forms/lease-form';

export default async function NewLeasePage() {
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  const [units, tenants] = await Promise.all([listUnits(ctx, {}), listTenants(ctx)]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New lease</h1>
      <LeaseForm
        mode="create"
        units={units.map((u) => ({ id: u.id, label: u.label, propertyName: u.property.name }))}
        tenants={tenants.map((t) => ({ id: t.id, firstName: t.firstName, lastName: t.lastName }))}
        postUrl="/api/leases"
      />
    </div>
  );
}
