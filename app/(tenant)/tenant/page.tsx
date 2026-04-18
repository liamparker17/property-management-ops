import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Coins,
  FileText,
  Inbox,
  Home as HomeIcon,
  ShieldCheck,
} from 'lucide-react';

import { auth } from '@/lib/auth';
import {
  getActiveLeaseForTenant,
  getTenantProfile,
  listTenantDocuments,
} from '@/lib/services/tenant-portal';
import { formatDate, formatZar } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
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
          <Card className="overflow-hidden p-0">
            <div
              aria-hidden
              className="h-1 bg-gradient-to-r from-primary via-violet-500 to-sky-500"
            />
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                    <HomeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Current residence
                    </div>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight">
                      {lease.unit.property.name} · {lease.unit.label}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lease.unit.property.addressLine1}, {lease.unit.property.suburb},{' '}
                      {lease.unit.property.city}
                    </p>
                  </div>
                </div>
                <Link href="/tenant/lease" className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
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
                  value={`${formatDate(lease.startDate)} → ${formatDate(lease.endDate)}`}
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
            <h2 className="text-lg font-semibold tracking-tight">Recent documents</h2>
            <p className="text-sm text-muted-foreground">Lease agreements and supporting files.</p>
          </div>
          <Link
            href="/tenant/documents"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
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
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-border/60">
              {documents.slice(0, 5).map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{doc.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {doc.kind.replaceAll('_', ' ').toLowerCase()} ·{' '}
                      {formatDate(doc.createdAt)}
                    </div>
                  </div>
                  <Link
                    href={`/api/documents/${doc.id}/download`}
                    className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
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
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
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
    <div className="rounded-xl border border-border bg-card/50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${TILE_TONE[tone]} [&_svg]:size-4`}
        >
          {icon}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="mt-2.5 text-base font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function RenewalBanner({ endDate }: { endDate: Date }) {
  const days = daysBetween(new Date(endDate), new Date());
  if (days < 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="text-sm">
          <p className="font-medium text-destructive">Your lease has ended</p>
          <p className="mt-0.5 text-destructive/80">
            The end date was {formatDate(endDate)}. Please contact your property manager.
          </p>
        </div>
      </div>
    );
  }
  if (days <= 60) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <CalendarDays className="h-4 w-4" />
        </div>
        <div className="text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">Renewal coming up</p>
          <p className="mt-0.5 text-amber-800 dark:text-amber-300/90">
            Your lease ends on {formatDate(endDate)} — that&rsquo;s in {days}{' '}
            {days === 1 ? 'day' : 'days'}. Your property manager may be in touch about renewal.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

