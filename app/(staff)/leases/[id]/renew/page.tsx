import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getLease } from '@/lib/services/leases';
import { listTenants } from '@/lib/services/tenants';
import { LeaseForm } from '@/components/forms/lease-form';
import { formatDate } from '@/lib/format';

export default async function RenewLeasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let lease;
  try {
    lease = await getLease(ctx, id);
  } catch {
    notFound();
  }
  const tenants = await listTenants(ctx);

  const defaultStart = new Date(lease.endDate);
  defaultStart.setUTCDate(defaultStart.getUTCDate() + 1);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setUTCFullYear(defaultEnd.getUTCFullYear() + 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Renew lease</h1>
      <p className="text-sm text-muted-foreground">
        Renewing {formatDate(lease.startDate)} → {formatDate(lease.endDate)} on {lease.unit.property.name} · {lease.unit.label}.
      </p>
      <LeaseForm
        mode="renew"
        units={[{ id: lease.unit.id, label: lease.unit.label, propertyName: lease.unit.property.name }]}
        tenants={tenants.map((t) => ({ id: t.id, firstName: t.firstName, lastName: t.lastName }))}
        initial={{
          unitId: lease.unit.id,
          tenantIds: lease.tenants.map((t) => t.tenantId),
          primaryTenantId: lease.tenants.find((t) => t.isPrimary)?.tenantId ?? lease.tenants[0].tenantId,
          startDate: formatDate(defaultStart),
          endDate: formatDate(defaultEnd),
          rentAmountCents: lease.rentAmountCents,
          depositAmountCents: lease.depositAmountCents,
          heldInTrustAccount: lease.heldInTrustAccount,
          paymentDueDay: lease.paymentDueDay,
          notes: lease.notes,
        }}
        postUrl={`/api/leases/${id}/renew`}
      />
    </div>
  );
}
