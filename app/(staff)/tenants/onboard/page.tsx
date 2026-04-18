import { auth } from '@/lib/auth';
import { listUnits } from '@/lib/services/units';
import { OnboardTenantForm } from '@/components/forms/onboard-tenant-form';
import { PageHeader } from '@/components/page-header';

export const dynamic = 'force-dynamic';

export default async function OnboardTenantPage() {
  const session = await auth();
  const ctx = {
    orgId: session!.user.orgId,
    userId: session!.user.id,
    role: session!.user.role,
  };
  const units = await listUnits(ctx, {});
  const unitOptions = units.map((u) => ({
    id: u.id,
    label: u.label,
    propertyName: u.property.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenants"
        title="Onboard new tenant"
        description="Create a tenant record, assign them to a unit with a draft lease, and optionally issue portal access in one step."
      />
      <OnboardTenantForm units={unitOptions} />
    </div>
  );
}
