import { formatDate } from '@/lib/format';

type LeaseRow = {
  id: string;
  tenant: string | null;
  property: string;
  unit: string;
  endDate: Date;
  daysUntilExpiry: number;
};

type Bucket = {
  id: string;
  label: string;
  rows: LeaseRow[];
};

type Props = {
  data: { buckets: Bucket[] };
};

const TH = 'px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground';

export function LeaseExpiriesDrill({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.buckets.map((bucket) => (
        <section key={bucket.id}>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {bucket.label} ({bucket.rows.length})
          </h3>
          {bucket.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leases expiring in this window.</p>
          ) : (
            <table className="min-w-full text-sm border border-border">
              <thead className="bg-[color:var(--muted)]/40 text-left">
                <tr>
                  <th className={TH}>Tenant</th>
                  <th className={TH}>Property / Unit</th>
                  <th className={`${TH} text-right`}>End Date</th>
                  <th className={`${TH} text-right`}>Days Until Expiry</th>
                </tr>
              </thead>
              <tbody>
                {bucket.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-2 text-foreground">
                      {r.tenant ?? <span className="text-muted-foreground italic">Primary tenant missing</span>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.property} / {r.unit}</td>
                    <td className="px-3 py-2 text-muted-foreground text-right">{formatDate(r.endDate)}</td>
                    <td className="px-3 py-2 text-foreground text-right">{r.daysUntilExpiry}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
