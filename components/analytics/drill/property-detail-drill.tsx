import Link from 'next/link';

import { formatDate, formatZar } from '@/lib/format';
import { cn } from '@/lib/utils';

type HealthBand = 'green' | 'gold' | 'orange' | 'red' | 'neutral';

function healthBandColor(score: number | null | undefined): HealthBand {
  if (score === null || score === undefined) return 'neutral';
  if (score >= 80) return 'green';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'orange';
  return 'red';
}

type Data = {
  property: { id: string; name: string; suburb: string | null; city: string | null; province: string };
  kpis: { occupancyPct: number; openMaintenance: number; arrearsCents: number; grossRentCents: number; healthScore: number | null };
  recentExpiringLeases: Array<{ id: string; tenant: string | null; unit: string; endDate: Date; daysUntilExpiry: number }>;
  recentMaintenance: Array<{ id: string; title: string; priority: string; status: string }>;
};

export function PropertyDetailDrill({ data }: { data: Data }) {
  const band = healthBandColor(data.kpis.healthScore);
  const badgeClass = cn(
    'inline-block rounded-sm px-2 py-0.5 text-xs font-medium',
    band === 'green' && 'bg-green-500/20 text-green-800 dark:bg-green-500/25 dark:text-green-200',
    band === 'gold' && 'bg-yellow-500/20 text-yellow-800 dark:bg-yellow-500/25 dark:text-yellow-200',
    band === 'orange' && 'bg-orange-500/20 text-orange-800 dark:bg-orange-500/25 dark:text-orange-200',
    band === 'red' && 'bg-red-500/20 text-red-800 dark:bg-red-500/25 dark:text-red-200',
    band === 'neutral' && 'bg-muted text-muted-foreground',
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{data.property.name}</h2>
          <p className="text-sm text-muted-foreground">{[data.property.suburb, data.property.city, data.property.province].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className={badgeClass}>Health {data.kpis.healthScore ?? '—'}</span>
          </div>
        </div>
        <Link
          href={`/properties/${data.property.id}`}
          className="border border-border bg-[color:var(--muted)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground"
        >
          Open property →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Occupancy" value={`${data.kpis.occupancyPct}%`} />
        <Stat label="Open maintenance" value={String(data.kpis.openMaintenance)} />
        <Stat label="Arrears" value={formatZar(data.kpis.arrearsCents)} />
        <Stat label="Gross rent" value={formatZar(data.kpis.grossRentCents)} />
      </div>

      <section>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Upcoming expiries</h3>
        {data.recentExpiringLeases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leases expiring in the next 90 days.</p>
        ) : (
          <table className="min-w-full text-sm border border-border">
            <thead className="bg-[color:var(--muted)]/40 text-left">
              <tr>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tenant</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Unit</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-right">End date</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-right">Days</th>
              </tr>
            </thead>
            <tbody>
              {data.recentExpiringLeases.map((l) => (
                <tr key={l.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-foreground">{l.tenant ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.unit}</td>
                  <td className="px-3 py-2 text-muted-foreground text-right">{formatDate(l.endDate)}</td>
                  <td className="px-3 py-2 text-muted-foreground text-right">{l.daysUntilExpiry}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Recent maintenance</h3>
        {data.recentMaintenance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open maintenance for this property.</p>
        ) : (
          <table className="min-w-full text-sm border border-border">
            <thead className="bg-[color:var(--muted)]/40 text-left">
              <tr>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Title</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Priority</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentMaintenance.map((m) => (
                <tr key={m.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-foreground">{m.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.priority}</td>
                  <td className="px-3 py-2 text-muted-foreground">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-[color:var(--muted)]/30 px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}
