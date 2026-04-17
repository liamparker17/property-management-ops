import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getMaintenanceRequest } from '@/lib/services/maintenance';
import { MaintenanceStatusBadge, MaintenancePriorityBadge } from '@/components/maintenance-badges';
import { formatDate } from '@/lib/format';
import { MaintenanceUpdateForm } from './update-form';

export const dynamic = 'force-dynamic';

export default async function MaintenanceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let req;
  try {
    req = await getMaintenanceRequest(ctx, id);
  } catch {
    notFound();
  }

  const canEdit = session!.user.role === 'ADMIN' || session!.user.role === 'PROPERTY_MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{req.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted {formatDate(req.createdAt)} by {req.tenant.firstName} {req.tenant.lastName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MaintenancePriorityBadge priority={req.priority} />
          <MaintenanceStatusBadge status={req.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Unit</p>
          <p className="mt-1 text-sm font-medium">
            <Link href={`/units/${req.unit.id}`} className="hover:text-primary">
              {req.unit.property.name} · {req.unit.label}
            </Link>
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tenant</p>
          <p className="mt-1 text-sm font-medium">
            <Link href={`/tenants/${req.tenant.id}`} className="hover:text-primary">
              {req.tenant.firstName} {req.tenant.lastName}
            </Link>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {req.tenant.email ?? '—'} · {req.tenant.phone ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolved</p>
          <p className="mt-1 text-sm font-medium">
            {req.resolvedAt ? formatDate(req.resolvedAt) : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Description
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm">{req.description}</p>
      </div>

      {canEdit ? (
        <MaintenanceUpdateForm
          id={req.id}
          status={req.status}
          priority={req.priority}
          internalNotes={req.internalNotes}
        />
      ) : req.internalNotes ? (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Internal notes
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm">{req.internalNotes}</p>
        </div>
      ) : null}
    </div>
  );
}
