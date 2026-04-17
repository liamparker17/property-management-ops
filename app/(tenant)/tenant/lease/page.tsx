import Link from 'next/link';
import { CalendarDays, Coins, FileText, Inbox, MapPin } from 'lucide-react';
import { auth } from '@/lib/auth';
import {
  getActiveLeaseForTenant,
  getTenantLeases,
} from '@/lib/services/tenant-portal';
import { formatDate, formatZar } from '@/lib/format';

const STATE_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-200',
  TERMINATED: 'bg-slate-100 text-slate-600 ring-slate-200',
  RENEWED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
};

export default async function TenantLeasePage() {
  const session = await auth();
  const userId = session!.user.id;
  const active = await getActiveLeaseForTenant(userId);
  const all = await getTenantLeases(userId);
  const history = all.filter((l) => l.id !== active?.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">My Lease</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full details for your current tenancy and past leases.
        </p>
      </div>

      {!active ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No active lease</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You don&rsquo;t have an active lease right now.
          </p>
        </div>
      ) : (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {active.unit.property.name} · {active.unit.label}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {active.unit.property.addressLine1}
                {active.unit.property.addressLine2 ? `, ${active.unit.property.addressLine2}` : ''},{' '}
                {active.unit.property.suburb}, {active.unit.property.city},{' '}
                {active.unit.property.postalCode}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ACTIVE
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <DetailRow
              icon={CalendarDays}
              label="Lease period"
              value={`${formatDate(active.startDate)} → ${formatDate(active.endDate)}`}
            />
            <DetailRow
              icon={Coins}
              label="Monthly rent"
              value={formatZar(active.rentAmountCents)}
              hint={`Due day ${active.paymentDueDay}`}
            />
            <DetailRow
              icon={Coins}
              label="Deposit"
              value={formatZar(active.depositAmountCents)}
              hint={active.heldInTrustAccount ? 'Held in trust account' : 'Not held in trust'}
            />
            <DetailRow
              icon={FileText}
              label="Unit specs"
              value={`${active.unit.bedrooms} bed · ${active.unit.bathrooms} bath${
                active.unit.sizeSqm ? ` · ${active.unit.sizeSqm} m²` : ''
              }`}
            />
          </div>

          {active.notes && (
            <div className="mt-6 rounded-lg bg-muted/40 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </div>
              <p className="mt-1 text-sm">{active.notes}</p>
            </div>
          )}

          <div className="mt-6 border-t pt-5">
            <h3 className="text-sm font-semibold">Lease documents</h3>
            {active.documents.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No documents uploaded yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {active.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{doc.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {doc.kind.replaceAll('_', ' ').toLowerCase()} · {formatDate(doc.createdAt)}
                      </div>
                    </div>
                    <Link
                      href={`/api/documents/${doc.id}/download`}
                      className="text-sm text-primary hover:underline"
                    >
                      Download
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Previous leases</h2>
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y">
              {history.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {l.unit.property.name} · {l.unit.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(l.startDate)} → {formatDate(l.endDate)} · {l.unit.property.city}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      STATE_STYLES[l.state] ?? STATE_STYLES.DRAFT
                    }`}
                  >
                    {l.state}
                  </span>
                  <span className="text-muted-foreground">{formatZar(l.rentAmountCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1.5 text-base font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
