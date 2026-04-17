import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getTenantMaintenanceRequest } from '@/lib/services/maintenance';
import { MaintenanceStatusBadge, MaintenancePriorityBadge } from '@/components/maintenance-badges';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function TenantRepairDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  let req;
  try {
    req = await getTenantMaintenanceRequest(session!.user.id, id);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{req.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {formatDate(req.createdAt)} · {req.unit.property.name} · {req.unit.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MaintenancePriorityBadge priority={req.priority} />
          <MaintenanceStatusBadge status={req.status} />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your description
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm">{req.description}</p>
      </div>

      {req.resolvedAt && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Resolved on {formatDate(req.resolvedAt)}.
        </div>
      )}
    </div>
  );
}
