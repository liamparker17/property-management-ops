import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Coins,
  FileText,
  Home as HomeIcon,
  Inbox,
  ShieldCheck,
} from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import { formatDate, formatZar } from '@/lib/format';
import {
  getActiveLeaseForTenant,
  getTenantProfile,
  listTenantDocuments,
} from '@/lib/services/tenant-portal';
import { cn } from '@/lib/utils';

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
      <PageHeader
        eyebrow="Welcome"
        title={`Hi, ${tenant.firstName}`}
        description="Here's everything relevant to your tenancy."
      />

      {!lease ? (
        <EmptyState
          icon={<Inbox className="size-5" />}
          title="No active lease"
          description="Your property manager hasn't activated a lease for you yet. Get in touch with them for details."
        />
      ) : (
        <>
          <Card className="overflow-hidden border border-border p-0">
            <div aria-hidden className="h-1 bg-gradient-to-r from-[color:var(--accent)] via-primary to-[color:var(--accent)]" />
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center border border-[color:var(--accent)]/25 text-[color:var(--accent)]">
                    <HomeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Current residence
                    </div>
                    <h2 className="mt-2 font-serif text-[30px] font-light leading-[1.05] tracking-[-0.01em] text-foreground">
                      {lease.unit.property.name} / {lease.unit.label}
                    </h2>
                    <p className="mt-2 text-sm leading-[1.7] text-muted-foreground">
                      {lease.unit.property.addressLine1}, {lease.unit.property.suburb}, {lease.unit.property.city}
                    </p>
                  </div>
                </div>
                <Link
                  href="/tenant/lease"
                  className={cn(
                    buttonVariants({ variant: 'outline' }),
                    'gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]',
                  )}
                >
                  View lease <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <InfoTile
                  icon={<Coins />}
                  label="Monthly rent"
                  value={formatZar(lease.rentAmountCents)}
                  hint={`Due day ${lease.paymentDueDay} of each month`}
                  tone="emerald"
                />
                <InfoTile
                  icon={<CalendarDays />}
                  label="Lease period"
                  value={`${formatDate(lease.startDate)} - ${formatDate(lease.endDate)}`}
                  tone="violet"
                />
                <InfoTile
                  icon={<ShieldCheck />}
                  label="Deposit"
                  value={formatZar(lease.depositAmountCents)}
                  hint={lease.heldInTrustAccount ? 'Held in trust' : 'Not held in trust'}
                  tone="sky"
                />
              </div>
            </CardContent>
          </Card>

          <RenewalBanner endDate={lease.endDate} />
        </>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[28px] font-light tracking-[-0.01em] text-foreground">
              Recent documents
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Lease agreements and supporting files.
            </p>
          </div>
          <Link
            href="/tenant/documents"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)] transition-colors hover:text-foreground"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="No documents yet"
            description="Your property manager will upload them here."
          />
        ) : (
          <Card className="overflow-hidden border border-border p-0">
            <ul className="divide-y divide-border/60">
              {documents.slice(0, 5).map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-4 px-5 py-4 text-sm transition-colors hover:bg-[color:var(--muted)]/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center border border-[color:var(--accent)]/25 text-[color:var(--accent)]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{doc.filename}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {doc.kind.replaceAll('_', ' ').toLowerCase()} / {formatDate(doc.createdAt)}
                    </div>
                  </div>
                  <Link
                    href={`/api/documents/${doc.id}/download`}
                    className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--accent)] transition-colors hover:text-foreground"
                  >
                    Download
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

const TILE_TONE = {
  emerald: 'border-emerald-600/20 text-emerald-700 dark:text-emerald-300',
  violet: 'border-primary/20 text-primary dark:text-primary-foreground',
  sky: 'border-[color:var(--accent)]/25 text-[color:var(--accent)]',
} as const;

function InfoTile({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: keyof typeof TILE_TONE;
}) {
  return (
    <div className="group relative overflow-hidden border border-border bg-card p-4 transition-colors hover:bg-[color:var(--muted)]/50">
      <span
        aria-hidden
        className={`absolute left-0 top-0 h-full w-0.5 ${tone === 'emerald' ? 'bg-emerald-500' : tone === 'violet' ? 'bg-primary' : 'bg-[color:var(--accent)]'}`}
      />
      <div className="flex items-center gap-2.5">
        <div className={`flex h-9 w-9 items-center justify-center border ${TILE_TONE[tone]} [&_svg]:size-4`}>
          {icon}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="mt-3 font-serif text-[24px] font-light leading-[1.15] tracking-[-0.01em] text-foreground">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function RenewalBanner({ endDate }: { endDate: Date }) {
  const days = daysBetween(new Date(endDate), new Date());

  if (days < 0) {
    return (
      <div className="relative overflow-hidden border border-destructive/20 bg-card px-5 py-4">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-destructive" />
        <div className="flex items-start gap-3 pl-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-destructive/20 text-destructive">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
              Your lease has ended
            </p>
            <p className="mt-2 leading-[1.7] text-destructive/80">
              The end date was {formatDate(endDate)}. Please contact your property manager.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (days <= 60) {
    return (
      <div className="relative overflow-hidden border border-[color:var(--accent)]/25 bg-card px-5 py-4">
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[color:var(--accent)]" />
        <div className="flex items-start gap-3 pl-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[color:var(--accent)]/25 text-[color:var(--accent)]">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
              Renewal coming up
            </p>
            <p className="mt-2 leading-[1.7] text-muted-foreground">
              Your lease ends on {formatDate(endDate)} - that's in {days} {days === 1 ? 'day' : 'days'}. Your
              property manager may be in touch about renewal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
