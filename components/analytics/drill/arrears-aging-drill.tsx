import { formatZar, formatDate } from '@/lib/format';

type ArrearsRow = {
  id: string;
  tenant: string;
  property: string;
  unit: string;
  cents: number;
  dueDate: Date;
  ageDays: number;
};

type Bucket = {
  id: string;
  label: string;
  rows: ArrearsRow[];
};

type Props = {
  data: { buckets: Bucket[] };
};

const TH = 'px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground';

export function ArrearsAgingDrill({ data }: Props) {
  return (
    <div className="space-y-6">
      {data.buckets.map((bucket) => (
        <section key={bucket.id}>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {bucket.label} ({bucket.rows.length})
          </h3>
          {bucket.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts in this bucket.</p>
          ) : (
            <table className="min-w-full text-sm border border-border">
              <thead className="bg-[color:var(--muted)]/40 text-left">
                <tr>
                  <th className={TH}>Tenant</th>
                  <th className={TH}>Property / Unit</th>
                  <th className={`${TH} text-right`}>Outstanding</th>
                  <th className={`${TH} text-right`}>Due</th>
                  <th className={`${TH} text-right`}>Age</th>
                </tr>
              </thead>
              <tbody>
                {bucket.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-2 text-foreground">{r.tenant}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.property} / {r.unit}</td>
                    <td className="px-3 py-2 text-foreground text-right">{formatZar(r.cents)}</td>
                    <td className="px-3 py-2 text-muted-foreground text-right">{formatDate(r.dueDate)}</td>
                    <td className="px-3 py-2 text-muted-foreground text-right">{r.ageDays}d</td>
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
