import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Building2, User2, CheckCircle2 } from 'lucide-react';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMaintenanceRequest } from '@/lib/services/maintenance';
import { listVendors } from '@/lib/services/vendors';
import { MaintenanceStatusBadge, MaintenancePriorityBadge } from '@/components/maintenance-badges';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatZar } from '@/lib/format';
import { AssignVendorDialog } from '@/components/forms/assign-vendor-dialog';
import { CaptureQuoteDialog } from '@/components/forms/capture-quote-dialog';
import { CaptureInvoiceDialog } from '@/components/forms/capture-invoice-dialog';
import {
  MaintenanceWorklogForm,
  ScheduleButton,
  CompleteForm,
} from '@/components/forms/maintenance-worklog-form';
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
  const canInvoice = canEdit || session!.user.role === 'FINANCE';

  const [vendors, quotes, worklogs, assignedVendor] = await Promise.all([
    canEdit ? listVendors(ctx, {}) : Promise.resolve([]),
    db.maintenanceQuote.findMany({
      where: { requestId: req.id, request: { orgId: ctx.orgId } },
      orderBy: { createdAt: 'desc' },
      include: { vendor: { select: { id: true, name: true } } },
    }),
    db.maintenanceWorklog.findMany({
      where: { requestId: req.id, request: { orgId: ctx.orgId } },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true, email: true } } },
    }),
    req.assignedVendorId
      ? db.vendor.findFirst({
          where: { id: req.assignedVendorId, orgId: ctx.orgId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  const scheduledIso = req.scheduledFor
    ? new Date(req.scheduledFor).toISOString().slice(0, 16)
    : undefined;

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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Vendor:</span>{' '}
                <span className="font-medium">{assignedVendor?.name ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estimate:</span>{' '}
                <span className="font-medium">
                  {req.estimatedCostCents != null ? formatZar(req.estimatedCostCents) : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Scheduled:</span>{' '}
                <span className="font-medium">
                  {req.scheduledFor ? formatDate(req.scheduledFor) : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Completed:</span>{' '}
                <span className="font-medium">
                  {req.completedAt ? formatDate(req.completedAt) : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Invoice:</span>{' '}
                <span className="font-medium">
                  {req.invoiceCents != null ? formatZar(req.invoiceCents) : '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <AssignVendorDialog
                requestId={req.id}
                vendors={vendors.filter((v) => !v.archivedAt).map((v) => ({ id: v.id, name: v.name }))}
              />
              <CaptureQuoteDialog
                requestId={req.id}
                vendors={vendors.filter((v) => !v.archivedAt).map((v) => ({ id: v.id, name: v.name }))}
              />
              {canInvoice && req.status === 'RESOLVED' ? (
                <CaptureInvoiceDialog requestId={req.id} />
              ) : null}
            </div>

            {req.assignedVendorId && !req.scheduledFor ? (
              <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Schedule visit
                </div>
                <ScheduleButton requestId={req.id} initial={scheduledIso} />
              </div>
            ) : null}

            {req.scheduledFor && !req.completedAt ? (
              <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mark complete
                </div>
                <CompleteForm requestId={req.id} />
              </div>
            ) : null}

            {req.invoiceCents != null ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                Posted to landlord ledger: {formatZar(req.invoiceCents)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quotes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes captured yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {quotes.map((q) => (
                <li key={q.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{formatZar(q.amountCents)}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(q.createdAt)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {q.vendor?.name ?? 'Unassigned vendor'}
                    {q.note ? ` · ${q.note}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Worklog
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {worklogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <ul className="space-y-3">
              {worklogs.map((w) => (
                <li key={w.id} className="rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{w.author?.name ?? w.author?.email ?? 'System'}</span>
                    <span>{formatDate(w.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{w.body}</p>
                </li>
              ))}
            </ul>
          )}
          {canEdit ? <MaintenanceWorklogForm requestId={req.id} /> : null}
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
