import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getLease } from '@/lib/services/leases';
import { LeaseStatusBadge } from '@/components/lease-status-badge';
import { formatDate, formatZar } from '@/lib/format';
import { LeaseActions } from './actions';
import { DocumentUpload } from './document-upload';
import { InvoicesPanel } from './invoices-panel';
import { listLeaseInvoices } from '@/lib/services/invoices';

export default async function LeaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const ctx = { orgId: session!.user.orgId, userId: session!.user.id, role: session!.user.role };
  let lease;
  try {
    lease = await getLease(ctx, id);
  } catch {
    notFound();
  }

  const primary = lease.tenants.find((t) => t.isPrimary)?.tenant;
  const coTenants = lease.tenants.filter((t) => !t.isPrimary).map((t) => t.tenant);

  const showInvoices = lease.state === 'ACTIVE' || lease.state === 'RENEWED';
  const rawInvoices = showInvoices ? await listLeaseInvoices(ctx, lease.id) : [];
  const invoices = rawInvoices.map((i) => ({
    id: i.id,
    periodStart: i.periodStart.toISOString(),
    dueDate: i.dueDate.toISOString(),
    amountCents: i.amountCents,
    status: i.status,
    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
    paidAmountCents: i.paidAmountCents,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link href={`/units/${lease.unit.id}`} className="text-sm text-muted-foreground hover:underline">
            ← {lease.unit.property.name} · {lease.unit.label}
          </Link>
          <h1 className="text-2xl font-semibold">
            Lease {formatDate(lease.startDate)} → {formatDate(lease.endDate)}
          </h1>
          <LeaseStatusBadge status={lease.status} />
        </div>
        <LeaseActions id={lease.id} state={lease.state} />
      </div>

      <section className="grid grid-cols-2 gap-4 text-sm">
        <Detail label="Rent" value={formatZar(lease.rentAmountCents)} />
        <Detail label="Deposit" value={`${formatZar(lease.depositAmountCents)}${lease.heldInTrustAccount ? ' (trust)' : ''}`} />
        <Detail label="Due day" value={`${lease.paymentDueDay}`} />
        {lease.terminatedAt && <Detail label="Terminated" value={`${formatDate(lease.terminatedAt)} — ${lease.terminatedReason ?? ''}`} />}
        {lease.renewedFrom && (
          <Detail
            label="Renewed from"
            value={<Link href={`/leases/${lease.renewedFrom.id}`} className="hover:underline">{formatDate(lease.renewedFrom.startDate)} → {formatDate(lease.renewedFrom.endDate)}</Link>}
          />
        )}
        {lease.renewedTo && (
          <Detail
            label="Renewed to"
            value={<Link href={`/leases/${lease.renewedTo.id}`} className="hover:underline">{formatDate(lease.renewedTo.startDate)} → {formatDate(lease.renewedTo.endDate)}</Link>}
          />
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Tenants</h2>
        <ul className="space-y-1 text-sm">
          {primary && (
            <li>
              <Link href={`/tenants/${primary.id}`} className="font-medium hover:underline">
                {primary.firstName} {primary.lastName}
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">(primary)</span>
            </li>
          )}
          {coTenants.map((t) => (
            <li key={t.id}>
              <Link href={`/tenants/${t.id}`} className="hover:underline">
                {t.firstName} {t.lastName}
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">(co-tenant)</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lease agreement</h2>
        {lease.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agreement uploaded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {lease.documents.map((d) => (
              <li key={d.id}>
                <a href={`/api/documents/${d.id}/download`} className="hover:underline">
                  {d.filename}
                </a>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({(d.sizeBytes / 1024).toFixed(0)} KB)
                </span>
              </li>
            ))}
          </ul>
        )}
        <DocumentUpload leaseId={lease.id} />
      </section>

      {showInvoices && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Invoices</h2>
          <InvoicesPanel invoices={invoices} />
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
