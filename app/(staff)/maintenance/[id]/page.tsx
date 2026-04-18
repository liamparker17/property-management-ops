import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, User2, CheckCircle2 } from 'lucide-react';

import { auth } from '@/lib/auth';
import { getMaintenanceRequest } from '@/lib/services/maintenance';
import { MaintenanceStatusBadge, MaintenancePriorityBadge } from '@/components/maintenance-badges';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Link
        href="/maintenance"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Maintenance
      </Link>

      <PageHeader
        eyebrow="Maintenance request"
        title={req.title}
        description={`Submitted ${formatDate(req.createdAt)} by ${req.tenant.firstName} ${req.tenant.lastName}`}
        actions={
          <div className="flex items-center gap-2">
            <MaintenancePriorityBadge priority={req.priority} />
            <MaintenanceStatusBadge status={req.status} />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Building2 className="size-3.5" />
              Unit
            </div>
            <p className="mt-2 text-sm font-medium">
              <Link href={`/units/${req.unit.id}`} className="hover:text-primary">
                {req.unit.property.name} · {req.unit.label}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <User2 className="size-3.5" />
              Tenant
            </div>
            <p className="mt-2 text-sm font-medium">
              <Link href={`/tenants/${req.tenant.id}`} className="hover:text-primary">
                {req.tenant.firstName} {req.tenant.lastName}
              </Link>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {req.tenant.email ?? '—'} · {req.tenant.phone ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CheckCircle2 className="size-3.5" />
              Resolved
            </div>
            <p className="mt-2 text-sm font-medium">
              {req.resolvedAt ? formatDate(req.resolvedAt) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{req.description}</p>
        </CardContent>
      </Card>

      {canEdit ? (
        <MaintenanceUpdateForm
          id={req.id}
          status={req.status}
          priority={req.priority}
          internalNotes={req.internalNotes}
        />
      ) : req.internalNotes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Internal notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{req.internalNotes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
