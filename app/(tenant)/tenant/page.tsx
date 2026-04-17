import Link from 'next/link';
import { ArrowRight, Building2, CalendarDays, Coins, FileText, Inbox } from 'lucide-react';
import { auth } from '@/lib/auth';
import {
  getActiveLeaseForTenant,
  getTenantProfile,
  listTenantDocuments,
} from '@/lib/services/tenant-portal';
import { formatDate, formatZar } from '@/lib/format';

function daysBetween(a: Date, b: Date) {
  return Math.ceil((a.getTime() - b.getTime()) / 86400000);
}

export default async function TenantHome() {
  const session = await auth();
  const userId = session!.user.id;
  const tenant = await getTenantProfile(userId);
  const lease = await getActiveLeaseForTenant(userId);
  const documents = await listTenantDocuments(userId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {tenant.firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&rsquo;s everything relevant to your tenancy.
        </p>
      </div>

      {!lease ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No active lease</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your property manager hasn&rsquo;t activated a lease for you yet. Get in touch with
            them for details.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current residence
                </div>
                <h2 className="mt-1 text-xl font-semibold">
                  {lease.unit.property.name} · {lease.unit.label}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lease.unit.property.addressLine1}, {lease.unit.property.suburb},{' '}
                  {lease.unit.property.city}
                </p>
              </div>
              <Link
                href="/tenant/lease"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                View lease <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <InfoTile
                icon={Coins}
                label="Monthly rent"
                value={formatZar(lease.rentAmountCents)}
                hint={`Due day ${lease.paymentDueDay} of each month`}
              />
              <InfoTile
                icon={CalendarDays}
                label="Lease period"
                value={`${formatDate(lease.startDate)} → ${formatDate(lease.endDate)}`}
              />
              <InfoTile
                icon={Building2}
                label="Deposit"
                value={formatZar(lease.depositAmountCents)}
                hint={lease.heldInTrustAccount ? 'Held in trust' : 'Not held in trust'}
              />
            </div>
          </section>

          <RenewalBanner endDate={lease.endDate} />
        </>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent documents</h2>
            <p className="text-sm text-muted-foreground">
              Lease agreements and supporting files.
            </p>
          </div>
          <Link
            href="/tenant/documents"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-10 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No documents yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your property manager will upload them here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <ul className="divide-y">
              {documents.slice(0, 5).map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{doc.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {doc.kind.replaceAll('_', ' ').toLowerCase()} ·{' '}
                      {formatDate(doc.createdAt)}
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
          </div>
        )}
      </section>
    </div>
  );
}

function InfoTile({
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

function RenewalBanner({ endDate }: { endDate: Date }) {
  const days = daysBetween(new Date(endDate), new Date());
  if (days < 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="text-sm">
          <p className="font-medium text-red-900">Your lease has ended</p>
          <p className="mt-0.5 text-red-800">
            The end date was {formatDate(endDate)}. Please contact your property manager.
          </p>
        </div>
      </div>
    );
  }
  if (days <= 60) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="font-medium text-amber-900">Renewal coming up</p>
          <p className="mt-0.5 text-amber-800">
            Your lease ends on {formatDate(endDate)} — that&rsquo;s in {days}{' '}
            {days === 1 ? 'day' : 'days'}. Your property manager may be in touch about renewal.
          </p>
        </div>
      </div>
    );
  }
  return null;
}
